const router = require('express').Router();
const validate = require('../middlewares/validate');
const v = require('../validators');
const a = require('../controllers/admin.controller');

// Mounted behind protect + restrictTo('admin') in routes/index.js
router.get('/analytics', a.analytics);
router.get('/ai-usage', a.aiUsage);
router.get('/users', a.users);
router.patch('/users/:id', v.adminUser, validate, a.updateUser);
router.get('/reviews', a.reviews);
router.patch('/reviews/:id', v.adminReview, validate, a.updateReview);
router.delete('/reviews/:id', v.mongoId, validate, a.deleteReview);
router.get('/reports', a.reports);
router.patch('/reports/:id', v.adminResolve, validate, a.resolveReport);
module.exports = router;
