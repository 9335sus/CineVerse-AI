const Comment = require('../models/Comment');
const WatchProgress = require('../models/WatchProgress');
const UserMovie = require('../models/UserMovie');
const Report = require('../models/Report');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination } = require('../utils/pagination');
const reports = require('../services/reports.service');

const progressOf = async (userId, tmdbId) => {
  const p = await WatchProgress.findOne({ user: userId, tmdbId });
  if (p) return p.status;
  return (await UserMovie.exists({ user: userId, tmdbId, watched: true })) ? 'finished' : 'not_started';
};
const idOf = (x) => String(x._id || x);
const notify = (req, tmdbId) => req.app.get('io')?.to(`d:${tmdbId}`).emit('discussion:changed', { tmdbId });

// Spoiler content is redacted on the SERVER unless the viewer finished the movie or wrote it.
const present = (c, ctx) => {
  const mine = idOf(c.user) === ctx.userId;
  const hidden = c.isHidden && ctx.role !== 'admin';
  const redacted = !hidden && c.isSpoiler && !ctx.finished && !mine;
  return {
    id: c.id, parent: c.parent, isSpoiler: c.isSpoiler, createdAt: c.createdAt, isMine: mine,
    user: { id: idOf(c.user), name: c.user.name }, hidden, redacted, moderated: c.isHidden,
    content: hidden || redacted ? null : c.content,
  };
};

exports.getProgress = asyncHandler(async (req, res) => res.json({ success: true, status: await progressOf(req.user.id, Number(req.params.tmdbId)) }));
exports.setProgress = asyncHandler(async (req, res) => {
  await WatchProgress.findOneAndUpdate({ user: req.user.id, tmdbId: Number(req.params.tmdbId) }, { status: req.body.status }, { upsert: true, setDefaultsOnInsert: true });
  res.json({ success: true, status: req.body.status });
});

exports.list = asyncHandler(async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  const { page, limit, skip } = parsePagination(req.query, 10, 30);
  const ctx = { userId: req.user.id, role: req.user.role, finished: (await progressOf(req.user.id, tmdbId)) === 'finished' };
  const filter = { tmdbId, parent: null };
  const [top, total] = await Promise.all([Comment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name'), Comment.countDocuments(filter)]);
  const replies = await Comment.find({ parent: { $in: top.map((t) => t._id) } }).sort({ createdAt: 1 }).populate('user', 'name');
  const items = top.map((t) => ({ ...present(t, ctx), replies: replies.filter((r) => String(r.parent) === t.id).map((r) => present(r, ctx)) }));
  res.json({ success: true, items, page, totalPages: Math.ceil(total / limit), total, progress: ctx.finished ? 'finished' : undefined });
});

exports.create = asyncHandler(async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  let parent = null;
  if (req.body.parent) {
    const p = await Comment.findById(req.body.parent);
    if (!p || p.tmdbId !== tmdbId) throw new ApiError(404, 'The comment you are replying to was not found');
    parent = p.parent || p._id; // threads are one level deep
  }
  const c = await Comment.create({ tmdbId, movieTitle: req.body.movieTitle, user: req.user.id, parent, content: req.body.content, isSpoiler: !!req.body.isSpoiler });
  notify(req, tmdbId);
  res.status(201).json({ success: true, id: c.id });
});

exports.reveal = asyncHandler(async (req, res) => {
  const c = await Comment.findById(req.params.id);
  if (!c || (c.isHidden && req.user.role !== 'admin')) throw new ApiError(404, 'Comment not found');
  res.json({ success: true, content: c.content });
});

exports.remove = asyncHandler(async (req, res) => {
  const c = await Comment.findById(req.params.id);
  if (!c) throw new ApiError(404, 'Comment not found');
  if (String(c.user) !== req.user.id && req.user.role !== 'admin') throw new ApiError(403, 'You can only delete your own comments');
  const ids = [c._id, ...(await Comment.find({ parent: c._id }).distinct('_id'))];
  await Promise.all([Comment.deleteMany({ _id: { $in: ids } }), Report.deleteMany({ targetType: 'comment', targetId: { $in: ids } })]);
  notify(req, c.tmdbId);
  res.json({ success: true });
});

exports.report = asyncHandler(async (req, res) => {
  const c = await reports.create(req.user.id, 'comment', req.params.id, req.body);
  notify(req, c.tmdbId);
  res.status(201).json({ success: true, message: 'Thanks. A moderator will review this.' });
});
