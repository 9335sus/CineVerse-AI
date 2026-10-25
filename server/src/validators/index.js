const { body, param } = require('express-validator');
exports.register = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];
exports.login = [
  body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];
exports.profile = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('bio').optional().isLength({ max: 300 }).withMessage('Bio is too long (max 300)'),
  body('preferredLanguage').optional().isLength({ min: 2, max: 5 }),
  body('favoriteGenres').optional().isArray({ max: 10 }).withMessage('Pick up to 10 genres'),
  body('favoriteGenres.*').optional().isInt(),
];
exports.password = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];
exports.tmdbId = [param('tmdbId').isInt({ min: 1 }).withMessage('Invalid movie id')];
exports.library = [
  ...exports.tmdbId,
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('inWatchlist').optional().isBoolean(),
  body('watched').optional().isBoolean(),
  body('genreIds').optional().isArray(),
];
exports.review = [
  ...exports.tmdbId,
  body('movieTitle').trim().notEmpty().withMessage('Movie title is required'),
  body('rating').isInt({ min: 1, max: 10 }).withMessage('Rating must be 1-10'),
  body('content').optional().isLength({ max: 2000 }).withMessage('Review is too long (max 2000)'),
];

const { MOOD_GENRES, INTENSITY_GENRES } = require('../services/recommendation.service');
exports.mood = [
  body('mood').isIn(Object.keys(MOOD_GENRES)).withMessage('Pick a mood'),
  body('intensity').optional().isIn(Object.keys(INTENSITY_GENRES)).withMessage('Invalid intensity'),
  body('genres').optional().isArray({ max: 6 }).withMessage('Pick up to 6 genres'),
  body('genres.*').optional().isInt(),
  body('language').optional({ values: 'falsy' }).isLength({ min: 2, max: 5 }),
  body('timeMinutes').optional({ values: 'falsy' }).isInt({ min: 30, max: 300 }).withMessage('Time must be 30-300 minutes'),
];
const code = param('code').isLength({ min: 6, max: 6 }).withMessage('Room codes have 6 characters');
exports.roomCreate = [body('name').trim().isLength({ min: 2, max: 40 }).withMessage('Room name must be 2-40 characters')];
exports.roomJoin = [body('code').trim().isLength({ min: 6, max: 6 }).withMessage('Room codes have 6 characters')];
exports.roomCode = [code];
exports.roomPrefs = [
  code,
  body('genres').optional().isArray({ max: 8 }), body('genres.*').optional().isInt(),
  body('dislikedGenres').optional().isArray({ max: 8 }), body('dislikedGenres.*').optional().isInt(),
  body('language').optional({ values: 'falsy' }).isLength({ min: 2, max: 5 }),
  body('maxRuntime').optional({ values: 'falsy' }).isInt({ min: 40, max: 300 }).withMessage('Max runtime must be 40-300 minutes'),
  body('mood').optional({ values: 'falsy' }).isIn(Object.keys(MOOD_GENRES)),
];
exports.roomVote = [code, body('tmdbId').isInt({ min: 1 }).withMessage('Invalid movie')];

// ---- Phase 5-6
const mongoId = (name = 'id') => param(name).isMongoId().withMessage('Invalid id');
exports.mongoId = [mongoId()];
exports.planSuggest = [
  body('mood').optional({ values: 'falsy' }).isIn(Object.keys(MOOD_GENRES)),
  body('genres').optional().isArray({ max: 6 }), body('genres.*').optional().isInt(),
  body('language').optional({ values: 'falsy' }).isLength({ min: 2, max: 5 }),
  body('timeMinutes').optional({ values: 'falsy' }).isInt({ min: 30, max: 300 }).withMessage('Time must be 30-300 minutes'),
];
exports.planCreate = [
  body('tmdbId').isInt({ min: 1 }), body('title').trim().notEmpty().withMessage('Title is required'),
  body('runtime').optional({ values: 'null' }).isInt({ min: 1, max: 900 }),
  body('scheduledFor').optional({ values: 'null' }).isISO8601().withMessage('Enter a valid date'),
  body('note').optional().isLength({ max: 300 }).withMessage('Note is too long (max 300)'),
];
exports.planUpdate = [
  mongoId(),
  body('scheduledFor').optional({ values: 'null' }).isISO8601().withMessage('Enter a valid date'),
  body('note').optional().isLength({ max: 300 }).withMessage('Note is too long (max 300)'),
  body('status').optional().isIn(['planned', 'completed']),
];
exports.storyCreate = [
  body('tmdbId').isInt({ min: 1 }).withMessage('Pick a movie'),
  body('whatIf').trim().isLength({ min: 5, max: 300 }).withMessage('Describe your what-if in 5-300 characters'),
  body('spoilerLevel').optional().isIn(['none', 'light', 'full']),
];
exports.storyChoose = [
  mongoId(),
  body('choiceIndex').optional().isInt({ min: 0, max: 2 }),
  body('custom').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Custom choice must be 3-200 characters'),
  body().custom((b) => b.choiceIndex !== undefined || !!b.custom).withMessage('Pick a choice or write your own'),
];
exports.comment = [
  ...exports.tmdbId,
  body('content').trim().isLength({ min: 1, max: 1500 }).withMessage('Comment must be 1-1500 characters'),
  body('isSpoiler').optional().isBoolean(), body('parent').optional({ values: 'falsy' }).isMongoId(),
  body('movieTitle').optional().isLength({ max: 200 }),
];
exports.progress = [...exports.tmdbId, body('status').isIn(['not_started', 'watching', 'finished']).withMessage('Invalid progress')];
exports.report = [mongoId(), body('reason').isIn(['spam', 'harassment', 'spoiler', 'inappropriate', 'other']).withMessage('Choose a reason'), body('details').optional().isLength({ max: 300 })];
exports.adminUser = [mongoId(), body('role').optional().isIn(['user', 'admin']), body('isActive').optional().isBoolean()];
exports.adminReview = [mongoId(), body('isHidden').isBoolean()];
exports.adminResolve = [mongoId(), body('action').isIn(['hide', 'delete', 'dismiss']).withMessage('Invalid action'), body('note').optional().isLength({ max: 300 })];
