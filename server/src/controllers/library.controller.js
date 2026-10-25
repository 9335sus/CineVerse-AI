const UserMovie = require('../models/UserMovie');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination } = require('../utils/pagination');

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const watched = req.query.status === 'watched';
  const filter = { user: req.user.id, ...(watched ? { watched: true } : { inWatchlist: true }) };
  const sort = watched ? { watchedAt: -1 } : { updatedAt: -1 };
  const [items, total] = await Promise.all([UserMovie.find(filter).sort(sort).skip(skip).limit(limit), UserMovie.countDocuments(filter)]);
  res.json({ success: true, items, page, totalPages: Math.ceil(total / limit), total });
});

exports.status = asyncHandler(async (req, res) => {
  const doc = await UserMovie.findOne({ user: req.user.id, tmdbId: req.params.tmdbId });
  res.json({ success: true, inWatchlist: !!doc?.inWatchlist, watched: !!doc?.watched });
});

exports.upsert = asyncHandler(async (req, res) => {
  const { title, posterPath, releaseDate, voteAverage, genreIds, inWatchlist, watched } = req.body;
  const filter = { user: req.user.id, tmdbId: Number(req.params.tmdbId) };
  const doc = (await UserMovie.findOne(filter)) || new UserMovie(filter);
  Object.assign(doc, { title, posterPath, releaseDate, voteAverage, genreIds: genreIds || [] });
  if (inWatchlist !== undefined) doc.inWatchlist = inWatchlist;
  if (watched !== undefined) {
    doc.watched = watched;
    doc.watchedAt = watched ? doc.watchedAt || new Date() : undefined;
    if (watched && inWatchlist === undefined) doc.inWatchlist = false;
  }
  if (!doc.inWatchlist && !doc.watched) {
    if (!doc.isNew) await doc.deleteOne();
    return res.json({ success: true, inWatchlist: false, watched: false });
  }
  await doc.save();
  res.json({ success: true, inWatchlist: doc.inWatchlist, watched: doc.watched });
});

exports.remove = asyncHandler(async (req, res) => {
  await UserMovie.deleteOne({ user: req.user.id, tmdbId: req.params.tmdbId });
  res.json({ success: true });
});
