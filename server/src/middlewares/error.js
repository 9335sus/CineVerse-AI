const ApiError = require('../utils/ApiError');
exports.notFound = (req, res, next) => next(new ApiError(404, `Route not found: ${req.originalUrl}`));
exports.errorHandler = (err, req, res, next) => { // eslint-disable-line
  let status = err.status || 500;
  let message = err.message || 'Server error';
  if (err.name === 'ValidationError') { status = 422; message = Object.values(err.errors)[0].message; }
  if (err.name === 'CastError') { status = 400; message = 'Invalid id'; }
  if (err.code === 11000) { status = 409; message = 'Already exists'; }
  if (status === 500 && process.env.NODE_ENV !== 'test') console.error(err);
  res.status(status).json({ success: false, message: status === 500 ? 'Internal server error' : message, details: err.details });
};
