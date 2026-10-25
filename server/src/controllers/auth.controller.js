const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const t = require('../utils/tokens');

const issue = async (res, user, status = 200) => {
  const refresh = t.signRefresh(user);
  user.refreshTokenHash = t.hash(refresh);
  await user.save({ validateModifiedOnly: true });
  res.cookie('refreshToken', refresh, t.cookieOpts);
  res.status(status).json({ success: true, accessToken: t.signAccess(user), user: user.toSafe() });
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new ApiError(409, 'Email is already registered');
  const user = await User.create({ name, email, password });
  await issue(res, user, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.comparePassword(req.body.password))) throw new ApiError(401, 'Incorrect email or password');
  if (!user.isActive) throw new ApiError(403, 'This account has been suspended');
  await issue(res, user);
});

exports.refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) throw new ApiError(401, 'No session');
  let payload;
  try { payload = t.verifyRefresh(token); } catch { throw new ApiError(401, 'Session expired'); }
  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.isActive || user.refreshTokenHash !== t.hash(token)) throw new ApiError(401, 'Session invalid');
  await issue(res, user); // rotation: the old refresh token stops working
});

exports.logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    try {
      const p = t.verifyRefresh(token);
      await User.updateOne({ _id: p.sub }, { $unset: { refreshTokenHash: 1 } });
    } catch { /* ignore */ }
  }
  res.clearCookie('refreshToken', { ...t.cookieOpts, maxAge: undefined });
  res.json({ success: true });
});

exports.me = (req, res) => res.json({ success: true, user: req.user.toSafe() });
