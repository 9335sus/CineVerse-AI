const Review = require('../models/Review');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination } = require('../utils/pagination');

exports.forMovie = asyncHandler(async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  const { page, limit, skip } = parsePagination(req.query, 10);
  const filter = { tmdbId, isHidden: false };
  const [items, total, stats] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name avatar'),
    Review.countDocuments(filter),
    Review.aggregate([{ $match: filter }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
  ]);
  res.json({ success: true, items, page, totalPages: Math.ceil(total / limit), average: stats[0] ? +stats[0].avg.toFixed(1) : null, count: stats[0]?.count || 0 });
});

exports.mine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 10);
  const filter = { user: req.user.id };
  const [items, total] = await Promise.all([Review.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit), Review.countDocuments(filter)]);
  res.json({ success: true, items, page, totalPages: Math.ceil(total / limit) });
});

exports.upsert = asyncHandler(async (req, res) => {
  const { movieTitle, posterPath, rating, content } = req.body;
  const review = await Review.findOneAndUpdate(
    { user: req.user.id, tmdbId: Number(req.params.tmdbId) },
    { movieTitle, posterPath, rating, content: content || '' },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  ).populate('user', 'name avatar');
  res.status(201).json({ success: true, review });
});

exports.remove = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');
  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') throw new ApiError(403, 'You can only delete your own reviews');
  await review.deleteOne();
  res.json({ success: true });
});
