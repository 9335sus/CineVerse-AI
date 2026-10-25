const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.updateMe = asyncHandler(async (req, res) => {
  ['name', 'bio', 'avatar', 'preferredLanguage', 'favoriteGenres'].forEach((k) => {
    if (req.body[k] !== undefined) req.user[k] = req.body[k];
  });
  await req.user.save();
  res.json({ success: true, user: req.user.toSafe() });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) throw new ApiError(400, 'Current password is incorrect');
  user.password = req.body.newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated' });
});
