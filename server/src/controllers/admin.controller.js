const User = require('../models/User');
const Review = require('../models/Review');
const Comment = require('../models/Comment');
const Report = require('../models/Report');
const Plan = require('../models/Plan');
const Story = require('../models/Story');
const Room = require('../models/Room');
const AiUsage = require('../models/AiUsage');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination } = require('../utils/pagination');
const { fillDays } = require('../services/dna.service');
const ai = require('../services/ai.service');
const { MODELS } = require('../services/reports.service');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const page = (total, p, limit) => ({ page: p, totalPages: Math.ceil(total / limit), total });
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

// ---- Users
exports.users = asyncHandler(async (req, res) => {
  const { page: p, limit, skip } = parsePagination(req.query, 15);
  const filter = {};
  if (req.query.search) { const r = new RegExp(esc(req.query.search.trim()), 'i'); filter.$or = [{ name: r }, { email: r }]; }
  if (['user', 'admin'].includes(req.query.role)) filter.role = req.query.role;
  if (req.query.active === 'true' || req.query.active === 'false') filter.isActive = req.query.active === 'true';
  const [items, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), User.countDocuments(filter)]);
  res.json({ success: true, items: items.map((u) => ({ ...u.toSafe(), isActive: u.isActive })), ...page(total, p, limit) });
});

exports.updateUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new ApiError(400, 'You cannot change your own role or status');
  const u = await User.findById(req.params.id);
  if (!u) throw new ApiError(404, 'User not found');
  if (req.body.role) u.role = req.body.role;
  if (req.body.isActive !== undefined) { u.isActive = req.body.isActive; if (!u.isActive) u.refreshTokenHash = undefined; } // suspension kills the session
  await u.save();
  res.json({ success: true, user: { ...u.toSafe(), isActive: u.isActive } });
});

// ---- Reviews
exports.reviews = asyncHandler(async (req, res) => {
  const { page: p, limit, skip } = parsePagination(req.query, 15);
  const filter = {};
  if (req.query.filter === 'hidden') filter.isHidden = true;
  if (req.query.filter === 'reported') filter.reportsCount = { $gt: 0 };
  const [items, total] = await Promise.all([Review.find(filter).sort({ reportsCount: -1, createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email'), Review.countDocuments(filter)]);
  res.json({ success: true, items, ...page(total, p, limit) });
});
exports.updateReview = asyncHandler(async (req, res) => {
  const r = await Review.findByIdAndUpdate(req.params.id, { isHidden: req.body.isHidden }, { new: true });
  if (!r) throw new ApiError(404, 'Review not found');
  res.json({ success: true, review: r });
});
exports.deleteReview = asyncHandler(async (req, res) => {
  const r = await Review.findByIdAndDelete(req.params.id);
  if (!r) throw new ApiError(404, 'Review not found');
  await Report.deleteMany({ targetType: 'review', targetId: r._id });
  res.json({ success: true });
});

// ---- Reports
exports.reports = asyncHandler(async (req, res) => {
  const { page: p, limit, skip } = parsePagination(req.query, 15);
  const filter = { status: ['open', 'resolved', 'dismissed'].includes(req.query.status) ? req.query.status : 'open' };
  const [items, total] = await Promise.all([Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('reporter', 'name'), Report.countDocuments(filter)]);
  const ids = (t) => items.filter((r) => r.targetType === t).map((r) => r.targetId);
  const [comments, reviews] = await Promise.all([Comment.find({ _id: { $in: ids('comment') } }).populate('user', 'name'), Review.find({ _id: { $in: ids('review') } }).populate('user', 'name')]);
  const map = new Map([...comments, ...reviews].map((t) => [t.id, t]));
  res.json({
    success: true, ...page(total, p, limit),
    items: items.map((r) => {
      const t = map.get(String(r.targetId));
      return { id: r.id, targetType: r.targetType, reason: r.reason, details: r.details, status: r.status, createdAt: r.createdAt, reporter: r.reporter?.name, resolution: r.resolution,
        target: t ? { text: t.content, author: t.user?.name, hidden: t.isHidden, reports: t.reportsCount, movie: t.movieTitle } : null };
    }),
  });
});

exports.resolveReport = asyncHandler(async (req, res) => {
  const { action, note } = req.body;
  const report = await Report.findById(req.params.id);
  if (!report) throw new ApiError(404, 'Report not found');
  const Model = MODELS[report.targetType];
  const target = await Model.findById(report.targetId);
  if (target) {
    if (action === 'hide') { target.isHidden = true; await target.save(); }
    if (action === 'delete') {
      if (report.targetType === 'comment') await Comment.deleteMany({ $or: [{ _id: target._id }, { parent: target._id }] });
      else await target.deleteOne();
    }
  }
  const status = action === 'dismiss' ? 'dismissed' : 'resolved';
  await Report.updateMany({ targetType: report.targetType, targetId: report.targetId, status: 'open', ...(action === 'dismiss' ? { _id: report._id } : {}) }, { status, resolvedBy: req.user.id, resolution: action, resolutionNote: note });
  if (action === 'dismiss' && target && !(await Report.exists({ targetType: report.targetType, targetId: report.targetId, status: 'open' }))) {
    target.isHidden = false; target.reportsCount = 0; await target.save(); // auto-hidden content comes back once nothing is open
  }
  res.json({ success: true });
});

// ---- Platform analytics
exports.analytics = asyncHandler(async (req, res) => {
  const [users, newUsers, active, reviews, comments, plans, stories, rooms, openReports, signups, topMovies] = await Promise.all([
    User.countDocuments(), User.countDocuments({ createdAt: { $gte: daysAgo(7) } }), User.countDocuments({ isActive: true }),
    Review.countDocuments(), Comment.countDocuments(), Plan.countDocuments(), Story.countDocuments(), Room.countDocuments(), Report.countDocuments({ status: 'open' }),
    User.aggregate([{ $match: { createdAt: { $gte: daysAgo(14) } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }]),
    Review.aggregate([{ $group: { _id: '$tmdbId', title: { $first: '$movieTitle' }, reviews: { $sum: 1 }, avg: { $avg: '$rating' } } }, { $sort: { reviews: -1 } }, { $limit: 5 }]),
  ]);
  res.json({ success: true, totals: { users, newUsers, active, reviews, comments, plans, stories, rooms, openReports }, signups: fillDays(signups), topMovies: topMovies.map((m) => ({ tmdbId: m._id, title: m.title, reviews: m.reviews, avg: +m.avg.toFixed(1) })) });
});

// ---- AI usage monitoring
exports.aiUsage = asyncHandler(async (req, res) => {
  const since = daysAgo(14);
  const [total, byFeature, perDay, errors] = await Promise.all([
    AiUsage.aggregate([{ $group: { _id: null, calls: { $sum: 1 }, success: { $sum: { $cond: ['$success', 1, 0] } }, fallback: { $sum: { $cond: ['$fallbackUsed', 1, 0] } }, avgLatency: { $avg: '$latencyMs' } } }]),
    AiUsage.aggregate([{ $group: { _id: '$feature', calls: { $sum: 1 }, success: { $sum: { $cond: ['$success', 1, 0] } } } }, { $sort: { calls: -1 } }]),
    AiUsage.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }]),
    AiUsage.find({ error: { $exists: true, $ne: null } }).sort({ createdAt: -1 }).limit(10).select('feature error createdAt provider'),
  ]);
  const t = total[0] || { calls: 0, success: 0, fallback: 0, avgLatency: 0 };
  res.json({
    success: true, configured: ai.isConfigured(), provider: ai.provider, model: ai.model,
    totals: { calls: t.calls, successRate: t.calls ? Math.round((t.success / t.calls) * 100) : 0, fallbackRate: t.calls ? Math.round((t.fallback / t.calls) * 100) : 0, avgLatencyMs: Math.round(t.avgLatency || 0) },
    byFeature: byFeature.map((f) => ({ feature: f._id, calls: f.calls, success: f.success })), perDay: fillDays(perDay), recentErrors: errors,
  });
});
