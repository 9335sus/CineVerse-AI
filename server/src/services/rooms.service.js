const crypto = require('crypto');
const Room = require('../models/Room');
const UserMovie = require('../models/UserMovie');
const ApiError = require('../utils/ApiError');
const { fetchCandidates, attachRuntimes } = require('./candidates.service');
const { rankForGroup } = require('./groupMatch.service');
const { MOOD_GENRES } = require('./recommendation.service');

const MAX_MEMBERS = 10;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const makeCode = () => Array.from({ length: 6 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
const idOf = (x) => String(x._id || x);

const load = async (code) => {
  const room = await Room.findOne({ code: String(code).toUpperCase() }).populate('members.user', 'name').populate('host', 'name');
  if (!room) throw new ApiError(404, 'Room not found. Check the code and try again.');
  return room;
};
const assertMember = (room, userId) => {
  if (!room.members.some((m) => idOf(m.user) === String(userId))) throw new ApiError(403, 'You are not a member of this room');
};
const assertHost = (room, userId) => {
  if (idOf(room.host) !== String(userId)) throw new ApiError(403, 'Only the room host can do that');
};

exports.getRoomForMember = async (code, userId) => {
  const room = await load(code);
  assertMember(room, userId);
  return room;
};

// Same payload for everyone in the room (personal prefs are not broadcast).
exports.serialize = (room, forUserId) => {
  const out = {
    code: room.code, name: room.name, status: room.status,
    host: { id: idOf(room.host), name: room.host.name },
    members: room.members.map((m) => ({ id: idOf(m.user), name: m.user.name })),
    submitted: room.preferences.map((p) => idOf(p.user)),
    recommendations: room.recommendations.map((r) => ({
      tmdbId: r.tmdbId, title: r.title, posterPath: r.posterPath, releaseDate: r.releaseDate, voteAverage: r.voteAverage,
      runtime: r.runtime, genreIds: r.genreIds, groupScore: r.groupScore, mean: r.mean, min: r.min,
      perUser: r.perUser.map((p) => ({ userId: idOf(p.user), score: p.score })),
    })),
    votes: room.votes.map((v) => ({ userId: idOf(v.user), tmdbId: v.tmdbId })),
    finalDecision: room.finalDecision?.tmdbId ? room.finalDecision : null,
    createdAt: room.createdAt,
  };
  if (forUserId) out.myPreferences = room.preferences.find((p) => idOf(p.user) === String(forUserId)) || null;
  return out;
};

exports.listMine = (userId) =>
  Room.find({ 'members.user': userId }).sort({ updatedAt: -1 }).limit(30).select('code name status members updatedAt');

exports.create = async (user, name) => {
  for (let i = 0; i < 5; i++) {
    try {
      const room = await Room.create({ code: makeCode(), name, host: user.id, members: [{ user: user.id }] });
      return load(room.code);
    } catch (e) { if (e.code !== 11000) throw e; }
  }
  throw new ApiError(500, 'Could not create a room code, please try again');
};

exports.join = async (code, userId) => {
  const room = await load(code);
  if (room.members.some((m) => idOf(m.user) === String(userId))) return { room, joined: false };
  if (room.status === 'decided') throw new ApiError(409, 'This room has already made its decision');
  if (room.members.length >= MAX_MEMBERS) throw new ApiError(409, `Rooms are limited to ${MAX_MEMBERS} people`);
  room.members.push({ user: userId });
  await room.save();
  return { room: await load(code), joined: true };
};

exports.submitPreferences = async (code, userId, prefs) => {
  const room = await exports.getRoomForMember(code, userId);
  if (room.status === 'decided') throw new ApiError(409, 'This room has already made its decision');
  const entry = {
    user: userId, genres: prefs.genres || [], dislikedGenres: prefs.dislikedGenres || [],
    language: prefs.language || '', maxRuntime: prefs.maxRuntime || null, mood: prefs.mood || '', submittedAt: new Date(),
  };
  const i = room.preferences.findIndex((p) => idOf(p.user) === String(userId));
  if (i >= 0) room.preferences[i] = entry; else room.preferences.push(entry);
  await room.save();
  return room;
};

exports.generate = async (code, userId) => {
  const room = await exports.getRoomForMember(code, userId);
  assertHost(room, userId);
  if (room.status === 'decided') throw new ApiError(409, 'This room has already made its decision');
  if (!room.preferences.length) throw new ApiError(400, 'At least one member must submit preferences first');

  const prefs = room.preferences.map((p) => ({ userId: idOf(p.user), genres: p.genres, dislikedGenres: p.dislikedGenres, language: p.language, maxRuntime: p.maxRuntime, mood: p.mood }));
  const genreUnion = [...new Set(prefs.flatMap((p) => (p.genres.length ? p.genres : MOOD_GENRES[p.mood] || [])))];
  const watched = await UserMovie.find({ user: { $in: room.members.map((m) => idOf(m.user)) }, watched: true }).distinct('tmdbId');

  const candidates = (await fetchCandidates({ genres: genreUnion, pages: [1, 2, 3], excludeIds: watched })).slice(0, 24);
  const ranked = rankForGroup(await attachRuntimes(candidates), prefs, { limit: 8 });
  if (!ranked.length) throw new ApiError(404, 'No movies fit everyone. Try relaxing genres or runtime limits.');

  room.recommendations = ranked.map((m) => ({
    tmdbId: m.id, title: m.title, posterPath: m.posterPath, releaseDate: m.releaseDate, voteAverage: m.voteAverage, runtime: m.runtime,
    genreIds: m.genreIds, language: m.language, groupScore: m.groupScore, mean: m.mean, min: m.min,
    perUser: m.perUser.map((p) => ({ user: p.userId, score: p.score })),
  }));
  room.votes = [];
  room.status = 'voting';
  await room.save();
  return room;
};

// Approval voting: each member can vote for any number of movies; voting again removes the vote.
exports.castVote = async (code, userId, tmdbId) => {
  const room = await exports.getRoomForMember(code, userId);
  if (room.status !== 'voting') throw new ApiError(409, 'Voting is not open in this room');
  if (!room.recommendations.some((r) => r.tmdbId === Number(tmdbId))) throw new ApiError(404, 'That movie is not in this room');
  const i = room.votes.findIndex((v) => idOf(v.user) === String(userId) && v.tmdbId === Number(tmdbId));
  if (i >= 0) room.votes.splice(i, 1); else room.votes.push({ user: userId, tmdbId: Number(tmdbId) });
  await room.save();
  return room;
};

exports.decide = async (code, userId) => {
  const room = await exports.getRoomForMember(code, userId);
  assertHost(room, userId);
  if (room.status !== 'voting') throw new ApiError(409, 'Generate recommendations before deciding');
  const tally = (id) => room.votes.filter((v) => v.tmdbId === id).length;
  const winner = [...room.recommendations].sort((a, b) => tally(b.tmdbId) - tally(a.tmdbId) || b.groupScore - a.groupScore)[0];
  room.finalDecision = { tmdbId: winner.tmdbId, title: winner.title, posterPath: winner.posterPath, voteCount: tally(winner.tmdbId), decidedAt: new Date() };
  room.status = 'decided';
  await room.save();
  return room;
};

exports.remove = async (code, userId) => {
  const room = await exports.getRoomForMember(code, userId);
  assertHost(room, userId);
  await room.deleteOne();
  return room;
};
