const express = require('express');
const router = express.Router();
const routingController = require('../controllers/routing.controller');
const { authRateLimiter, sensitiveRateLimiter, defaultRateLimiter } = require('../middlewares/rateLimiter');
const { logger } = require('../config/logger');

const validateAuthServiceAccess = (req, res, next) => {
  const endPoint = decodeURIComponent(req.params.endPoint);
  let allowedEndpoints = ['auth'];
  if (endPoint !== 'auth') {
    logger.warn('Unauthorized auth route access attempt', {
      endPoint,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.originalUrl
    });
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only auth service endpoints are allowed.',
      allowedEndpoints: ['auth']
    });
  }
  next();
};

router.use(authRateLimiter);

router.all('/:endPoint/*', validateAuthServiceAccess, routingController.useService);
router.all('/:endPoint', validateAuthServiceAccess, routingController.useService);

module.exports = router;