const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { param } = require('express-validator');
const { protect } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const v = require('../validators');
const auth = require('../controllers/auth.controller');
const user = require('../controllers/user.controller');
const movie = require('../controllers/movie.controller');
const lib = require('../controllers/library.controller');
const review = require('../controllers/review.controller');
const rec = require('../controllers/recommendation.controller');
const rooms = require('../controllers/rooms.controller');
const planner = require('../controllers/planner.controller');
const stories = require('../controllers/story.controller');
const discuss = require('../controllers/discussion.controller');
const analytics = require('../controllers/analytics.controller');
const reportsSvc = require('../services/reports.service');
const { restrictTo } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, try again later' },
});

const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: process.env.NODE_ENV === 'test' ? 1000 : 30, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Hourly recommendation limit reached, try again later' } });

router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));

// Auth
router.post('/auth/register', authLimiter, v.register, validate, auth.register);
router.post('/auth/login', authLimiter, v.login, validate, auth.login);
router.post('/auth/refresh', auth.refresh);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', protect, auth.me);

// Users
router.patch('/users/me', protect, v.profile, validate, user.updateMe);
router.patch('/users/me/password', protect, v.password, validate, user.changePassword);

// Movies (public, proxied from TMDB)
router.get('/movies/genres', movie.genres);
router.get('/movies/search', movie.search);
router.get('/movies/upcoming', movie.upcoming);
router.get('/movies/:id/providers', param('id').isInt().withMessage('Invalid movie id'), validate, movie.providers);
router.get('/movies/list/:category', movie.list);
router.get('/movies/:id', param('id').isInt().withMessage('Invalid movie id'), validate, movie.details);

// Watchlist / watched
router.get('/watchlist', protect, lib.list);
router.get('/watchlist/:tmdbId', protect, v.tmdbId, validate, lib.status);
router.put('/watchlist/:tmdbId', protect, v.library, validate, lib.upsert);
router.delete('/watchlist/:tmdbId', protect, v.tmdbId, validate, lib.remove);

// Reviews
router.get('/reviews/me', protect, review.mine);
router.get('/reviews/movie/:tmdbId', v.tmdbId, validate, review.forMovie);
router.put('/reviews/movie/:tmdbId', protect, v.review, validate, review.upsert);
router.delete('/reviews/:id', protect, param('id').isMongoId(), validate, review.remove);

// AI Mood Matcher
router.post('/recommendations/mood', protect, aiLimiter, v.mood, validate, rec.mood);
router.get('/recommendations/history', protect, rec.history);
router.delete('/recommendations/:id', protect, param('id').isMongoId(), validate, rec.remove);

// CineSync rooms
router.get('/rooms', protect, rooms.mine);
router.post('/rooms', protect, v.roomCreate, validate, rooms.create);
router.post('/rooms/join', protect, v.roomJoin, validate, rooms.join);
router.get('/rooms/:code', protect, v.roomCode, validate, rooms.get);
router.put('/rooms/:code/preferences', protect, v.roomPrefs, validate, rooms.preferences);
router.post('/rooms/:code/recommendations', protect, aiLimiter, v.roomCode, validate, rooms.recommend);
router.post('/rooms/:code/vote', protect, v.roomVote, validate, rooms.vote);
router.post('/rooms/:code/decide', protect, v.roomCode, validate, rooms.decide);
router.delete('/rooms/:code', protect, v.roomCode, validate, rooms.remove);

// Smart Planner
router.post('/planner/suggest', protect, aiLimiter, v.planSuggest, validate, planner.suggest);
router.get('/planner', protect, planner.list);
router.post('/planner', protect, v.planCreate, validate, planner.create);
router.patch('/planner/:id', protect, v.planUpdate, validate, planner.update);
router.delete('/planner/:id', protect, v.mongoId, validate, planner.remove);

// Story Simulator
router.get('/stories', protect, stories.list);
router.post('/stories', protect, aiLimiter, v.storyCreate, validate, stories.create);
router.get('/stories/:id', protect, v.mongoId, validate, stories.get);
router.post('/stories/:id/choose', protect, aiLimiter, v.storyChoose, validate, stories.choose);
router.delete('/stories/:id', protect, v.mongoId, validate, stories.remove);

// Spoiler-safe discussions
router.get('/discussions/:tmdbId/progress', protect, v.tmdbId, validate, discuss.getProgress);
router.put('/discussions/:tmdbId/progress', protect, v.progress, validate, discuss.setProgress);
router.get('/discussions/:tmdbId', protect, v.tmdbId, validate, discuss.list);
router.post('/discussions/:tmdbId/comments', protect, v.comment, validate, discuss.create);
router.get('/discussions/comments/:id/reveal', protect, v.mongoId, validate, discuss.reveal);
router.delete('/discussions/comments/:id', protect, v.mongoId, validate, discuss.remove);
router.post('/discussions/comments/:id/report', protect, v.report, validate, discuss.report);
router.post('/reviews/:id/report', protect, v.report, validate, asyncHandler(async (req, res) => {
  await reportsSvc.create(req.user.id, 'review', req.params.id, req.body);
  res.status(201).json({ success: true, message: 'Thanks. A moderator will review this.' });
}));

// Movie DNA
router.get('/analytics/dna', protect, analytics.dna);
router.get('/analytics/compatibility', protect, analytics.compatibility);

// Admin (role-based access control)
router.use('/admin', protect, restrictTo('admin'), require('./admin.routes'));

module.exports = router;
