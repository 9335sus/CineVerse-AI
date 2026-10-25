const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccess } = require('../utils/tokens');
const User = require('../models/User');

exports.protect = asyncHandler(async (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) throw new ApiError(401, 'Authentication required');
  let payload;
  try { payload = verifyAccess(h.slice(7)); } catch { throw new ApiError(401, 'Invalid or expired token'); }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'Account not available');
  req.user = user;
  next();
});

exports.restrictTo = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new ApiError(403, 'You do not have permission to do that'));
