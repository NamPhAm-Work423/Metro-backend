const express = require('express');
const router = express.Router();
const routingController = require('../controllers/routing.controller');
const { apiRateLimiter, burstProtection } = require('../middlewares/rateLimiter');
const { logger } = require('../config/logger');

// More restrictive rate limiter for guest/public access
const guestRateLimiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs (more restrictive than authenticated users)
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req, res) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/public/health';
  }
});

// Middleware to validate that only public service endpoints are accessed
const validatePublicServiceAccess = (req, res, next) => {
  const endPoint = decodeURIComponent(req.params.endPoint);
  
  // Only allow access to 'public' service endpoint
  if (endPoint !== 'public') {
    logger.warn('Unauthorized guest access attempt', {
      endPoint,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.originalUrl
    });
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. Guest access is only available for public service endpoints.',
      allowedEndpoints: ['public']
    });
  }
  
  next();
};

// Middleware to log guest access for monitoring
const logGuestAccess = (req, res, next) => {
  logger.info('Guest access request', {
    endPoint: req.params.endPoint,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  req.isGuestRoute = true;
  
  next();
};

// Apply security middlewares to all guest routes
router.use(guestRateLimiter);
router.use(burstProtection);
router.use(logGuestAccess);

// Guest routes - only allow access to public service
// More specific routes first - catches paths with additional segments
router.all('/:endPoint/*', validatePublicServiceAccess, routingController.useService);
// Less specific routes last - catches exact endpoint matches
router.all('/:endPoint', validatePublicServiceAccess, routingController.useService);

module.exports = router;
