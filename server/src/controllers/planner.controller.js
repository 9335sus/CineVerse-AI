const Plan = require('../models/Plan');
const UserMovie = require('../models/UserMovie');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination } = require('../utils/pagination');
const { fetchCandidates, attachRuntimes, genreMap } = require('../services/candidates.service');
const { MOOD_GENRES, rankMovies, fallbackExplanation } = require('../services/recommendation.service');
const { topGenreIds } = require('../services/dna.service');
const { markWatched } = require('../services/library.service');

// Suggestions use viewing time, mood, genre, language AND what the user has already watched.
exports.suggest = asyncHandler(async (req, res) => {
  const b = req.body;
  const prefs = { mood: b.mood || '', genres: b.genres || [], language: b.language || '', timeMinutes: b.timeMinutes || null, intensity: b.intensity || 'medium' };
  const watched = await UserMovie.find({ user: req.user.id, watched: true }).select('tmdbId genreIds').lean();
  const planned = await Plan.find({ user: req.user.id, status: 'planned' }).distinct('tmdbId');
  const userGenres = [...new Set([...topGenreIds(watched, 4), ...(req.user.favoriteGenres || [])])];
  const pool = prefs.genres.length ? prefs.genres : MOOD_GENRES[prefs.mood] || userGenres;

  const candidates = await fetchCandidates({ genres: pool, language: prefs.language, excludeIds: [...watched.map((w) => w.tmdbId), ...planned], pages: [1, 2] });
  const shortlist = rankMovies(candidates, prefs, userGenres).slice(0, 15);
  const top = rankMovies(await attachRuntimes(shortlist), prefs, userGenres).slice(0, 6);
  const gMap = await genreMap().catch(() => ({}));
  res.json({
    success: true, basedOnHistory: watched.length,
    results: top.map((m) => ({ tmdbId: m.id, title: m.title, posterPath: m.posterPath, releaseDate: m.releaseDate, voteAverage: m.voteAverage, runtime: m.runtime, genreIds: m.genreIds, score: m.score, reason: fallbackExplanation(m, prefs, gMap) })),
  });
});

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 12);
  const status = req.query.status === 'completed' ? 'completed' : 'planned';
  const filter = { user: req.user.id, status };
  const sort = status === 'planned' ? { scheduledFor: 1, createdAt: -1 } : { completedAt: -1 };
  const [items, total] = await Promise.all([Plan.find(filter).sort(sort).skip(skip).limit(limit), Plan.countDocuments(filter)]);
  res.json({ success: true, items, page, totalPages: Math.ceil(total / limit), total });
});

exports.create = asyncHandler(async (req, res) => {
  const { tmdbId, title, posterPath, releaseDate, voteAverage, runtime, genreIds, scheduledFor, note } = req.body;
  const plan = await Plan.create({ user: req.user.id, tmdbId, title, posterPath, releaseDate, voteAverage, runtime, genreIds, scheduledFor, note });
  res.status(201).json({ success: true, plan });
});

exports.update = asyncHandler(async (req, res) => {
  const plan = await Plan.findOne({ _id: req.params.id, user: req.user.id });
  if (!plan) throw new ApiError(404, 'Plan not found');
  const { scheduledFor, note, status } = req.body;
  if (scheduledFor !== undefined) plan.scheduledFor = scheduledFor;
  if (note !== undefined) plan.note = note;
  if (status && status !== plan.status) {
    plan.status = status;
    plan.completedAt = status === 'completed' ? new Date() : undefined;
    if (status === 'completed') await markWatched(req.user.id, plan); // keeps library + Movie DNA in sync
  }
  await plan.save();
  res.json({ success: true, plan });
});

exports.remove = asyncHandler(async (req, res) => {
  const r = await Plan.deleteOne({ _id: req.params.id, user: req.user.id });
  if (!r.deletedCount) throw new ApiError(404, 'Plan not found');
  res.json({ success: true });
});
