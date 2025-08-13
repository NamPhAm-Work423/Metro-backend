const express = require('express');
const router = express.Router();
const routingController = require('../controllers/routing.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter');

// Apply rate limiting to all routing endpoints (single limiter to avoid double counts)
router.use(apiRateLimiter);

// Dynamic routing - all HTTP methods supported
// More specific routes first - catches paths with additional segments
router.all('/:endPoint/*', authMiddleware.authenticate, routingController.useService);
// Less specific routes last - catches exact endpoint matches
router.all('/:endPoint', authMiddleware.authenticate, routingController.useService);

module.exports = router;
