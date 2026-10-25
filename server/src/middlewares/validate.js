const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
module.exports = (req, res, next) => {
  const r = validationResult(req);
  if (r.isEmpty()) return next();
  const details = r.array().map((e) => ({ field: e.path, message: e.msg }));
  next(new ApiError(422, details[0].message, details));
};
