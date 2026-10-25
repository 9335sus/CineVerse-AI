const Report = require('../models/Report');
const Comment = require('../models/Comment');
const Review = require('../models/Review');
const ApiError = require('../utils/ApiError');

const AUTO_HIDE_AT = 3;
exports.MODELS = { comment: Comment, review: Review };

exports.create = async (reporterId, targetType, targetId, { reason, details }) => {
  const Model = exports.MODELS[targetType];
  const target = await Model.findById(targetId);
  if (!target) throw new ApiError(404, 'Nothing to report here');
  if (String(target.user) === String(reporterId)) throw new ApiError(400, 'You cannot report your own content');
  try { await Report.create({ reporter: reporterId, targetType, targetId, reason, details }); }
  catch (e) { if (e.code === 11000) throw new ApiError(409, 'You already reported this'); throw e; }
  target.reportsCount += 1;
  if (target.reportsCount >= AUTO_HIDE_AT) target.isHidden = true; // hidden pending moderator review
  await target.save();
  return target;
};
