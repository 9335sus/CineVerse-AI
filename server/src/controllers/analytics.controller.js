const mongoose = require('mongoose');
const UserMovie = require('../models/UserMovie');
const Review = require('../models/Review');
const Room = require('../models/Room');
const asyncHandler = require('../utils/asyncHandler');
const dna = require('../services/dna.service');
const { genreMap } = require('../services/candidates.service');

const oid = (id) => new mongoose.Types.ObjectId(id);

exports.dna = asyncHandler(async (req, res) => {
  const user = oid(req.user.id);
  const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 11, 1));
  const [totalWatched, genreRows, monthRows, ratingRows, gMap] = await Promise.all([
    UserMovie.countDocuments({ user, watched: true }),
    UserMovie.aggregate([{ $match: { user, watched: true } }, { $unwind: '$genreIds' }, { $group: { _id: '$genreIds', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    UserMovie.aggregate([{ $match: { user, watched: true, watchedAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$watchedAt' } }, count: { $sum: 1 } } }]),
    Review.aggregate([{ $match: { user } }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
    genreMap().catch(() => ({})), // names are cosmetic: degrade to ids if TMDB is down
  ]);
  const ratedCount = ratingRows.reduce((a, r) => a + r.count, 0);
  const avgRating = ratedCount ? ratingRows.reduce((a, r) => a + r._id * r.count, 0) / ratedCount : null;
  const occurrences = genreRows.reduce((a, r) => a + r.count, 0);
  const favoriteGenres = genreRows.slice(0, 8).map((r) => ({ id: r._id, name: gMap[r._id] || `Genre ${r._id}`, count: r.count }));
  res.json({
    success: true, totalWatched, reviewsWritten: ratedCount, averageRating: avgRating ? +avgRating.toFixed(1) : null,
    favoriteGenres, ratingsDistribution: dna.fillRatings(ratingRows), monthlyActivity: dna.fillMonths(monthRows),
    insights: dna.insights({ topGenreIds: genreRows.map((r) => r._id), topShare: occurrences ? genreRows[0].count / occurrences : 0, distinctGenres: genreRows.length, avgRating, ratedCount, totalWatched }),
  });
});

// "Friends" = people you have shared a CineSync room with.
exports.compatibility = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const rooms = await Room.find({ 'members.user': me }).select('members.user').lean();
  const friendIds = [...new Set(rooms.flatMap((r) => r.members.map((m) => String(m.user))))].filter((id) => id !== me).slice(0, 12);
  if (!friendIds.length) return res.json({ success: true, friends: [] });

  const everyone = [me, ...friendIds].map(oid);
  const [genreRows, movieRows, users] = await Promise.all([
    UserMovie.aggregate([{ $match: { user: { $in: everyone }, watched: true } }, { $unwind: '$genreIds' }, { $group: { _id: { u: '$user', g: '$genreIds' }, count: { $sum: 1 } } }]),
    UserMovie.aggregate([{ $match: { user: { $in: everyone }, watched: true } }, { $group: { _id: '$user', ids: { $addToSet: '$tmdbId' } } }]),
    require('../models/User').find({ _id: { $in: friendIds } }).select('name'),
  ]);
  const vec = {};
  genreRows.forEach((r) => { (vec[r._id.u] = vec[r._id.u] || new Map()).set(r._id.g, r.count); });
  const movies = Object.fromEntries(movieRows.map((r) => [String(r._id), new Set(r.ids)]));
  const mine = vec[me] || new Map();
  const friends = users.map((u) => {
    const theirs = vec[u.id] || new Map();
    const shared = [...(movies[u.id] || [])].filter((id) => movies[me]?.has(id)).length;
    return { id: u.id, name: u.name, score: mine.size && theirs.size ? dna.compatibility(mine, theirs, shared) : null, sharedMovies: shared };
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  res.json({ success: true, friends });
});
