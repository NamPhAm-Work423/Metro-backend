const rateLimit = require('express-rate-limit');
const redis = require('../config/redis');
const config = require('..');
const logger = require('../config/logger');

// Redis store for rate limiter
class RedisStore {
  constructor(options = {}) {
    this.redis = redis;
    this.keyPrefix = options.prefix || 'rl:';
    this.windowMs = options.windowMs || 60000;
  }

  async increment(key) {
    try {
      const fullKey = this.keyPrefix + key;
      const current = await this.redis.incr(fullKey);
      
      if (current === 1) {
        await this.redis.expire(fullKey, Math.ceil(this.windowMs / 1000));
      }
      
      return {
        totalHits: current,
        resetTime: new Date(Date.now() + this.windowMs)
      };
    } catch (error) {
      logger.error('Redis rate limiter error:', error);
      // Fallback: allow request if Redis fails
      return {
        totalHits: 1,
        resetTime: new Date(Date.now() + this.windowMs)
      };
    }
  }

  async decrement(key) {
    try {
      const fullKey = this.keyPrefix + key;
      await this.redis.decr(fullKey);
    } catch (error) {
      logger.error('Redis rate limiter decrement error:', error);
    }
  }

  async resetKey(key) {
    try {
      const fullKey = this.keyPrefix + key;
      await this.redis.del(fullKey);
    } catch (error) {
      logger.error('Redis rate limiter reset error:', error);
    }
  }
}

// Key generator function
const keyGenerator = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
  const userId = req.user?.id || 'anonymous';
  return `${ip}:${userId}`;
};

// Skip function for successful requests
const skipSuccessfulRequests = (req, res) => res.statusCode < 400;

// Default rate limiter
const defaultRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:default:',
    windowMs: 15 * 60 * 1000
  }),
  keyGenerator,
  skipSuccessfulRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  onLimitReached: (req, res, options) => {
    logger.warn('Rate limit reached', {
      ip: req.ip,
      userId: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent']
    });
  }
});

// Authentication rate limiter (stricter for auth endpoints)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:auth:',
    windowMs: 15 * 60 * 1000
  }),
  keyGenerator,
  skipSuccessfulRequests: false, // Count all auth attempts
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  onLimitReached: (req, res, options) => {
    logger.warn('Auth rate limit reached', {
      ip: req.ip,
      userId: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent']
    });
  }
});

// Sensitive operations rate limiter (password reset, etc.)
const sensitiveRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 sensitive requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:sensitive:',
    windowMs: 60 * 60 * 1000
  }),
  keyGenerator,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many sensitive operations, please try again later.'
  },
  onLimitReached: (req, res, options) => {
    logger.warn('Sensitive operations rate limit reached', {
      ip: req.ip,
      userId: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent']
    });
  }
});

// API rate limiter (for external APIs)
const apiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit each IP to 1000 API requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:api:',
    windowMs: 60 * 60 * 1000
  }),
  keyGenerator,
  skipSuccessfulRequests,
  message: {
    success: false,
    message: 'API rate limit exceeded, please try again later.'
  },
  onLimitReached: (req, res, options) => {
    logger.warn('API rate limit reached', {
      ip: req.ip,
      userId: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent']
    });
  }
});

// Per-user rate limiter
const createUserRateLimiter = (windowMs = 60 * 1000, max = 60) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      prefix: 'rl:user:',
      windowMs
    }),
    keyGenerator: (req) => req.user?.id || req.ip,
    skipSuccessfulRequests,
    message: {
      success: false,
      message: 'User rate limit exceeded, please slow down.'
    },
    skip: (req) => !req.user, // Skip if user not authenticated
    onLimitReached: (req, res, options) => {
      logger.warn('User rate limit reached', {
        userId: req.user?.id,
        endpoint: req.originalUrl,
        method: req.method
      });
    }
  });
};

// Burst protection (very short window, high limit)
const burstProtection = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // 10 requests per second
  standardHeaders: false,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:burst:',
    windowMs: 1000
  }),
  keyGenerator,
  skipSuccessfulRequests,
  message: {
    success: false,
    message: 'Too many requests in a short time, please slow down.'
  }
});

// Progressive rate limiter (increases penalty for repeated violations)
const createProgressiveRateLimiter = (baseWindowMs = 15 * 60 * 1000, baseMax = 100) => {
  return async (req, res, next) => {
    try {
      const key = `progressive:${keyGenerator(req)}`;
      const violationKey = `violations:${keyGenerator(req)}`;
      
      // Check violation count
      const violations = await redis.get(violationKey) || 0;
      const penalty = Math.min(violations * 2, 10); // Max 10x penalty
      
      const adjustedMax = Math.max(baseMax - penalty * 5, 5); // Min 5 requests
      const adjustedWindow = baseWindowMs * (1 + penalty * 0.5); // Increase window
      
      // Apply rate limit
      const limiter = rateLimit({
        windowMs: adjustedWindow,
        max: adjustedMax,
        store: new RedisStore({
          prefix: 'rl:progressive:',
          windowMs: adjustedWindow
        }),
        keyGenerator,
        message: {
          success: false,
          message: `Rate limit exceeded. Current limit: ${adjustedMax} requests per ${Math.round(adjustedWindow / 60000)} minutes.`
        },
        onLimitReached: async () => {
          // Increment violation count
          await redis.setex(violationKey, 24 * 60 * 60, parseInt(violations) + 1); // 24 hour expiry
        }
      });
      
      limiter(req, res, next);
    } catch (error) {
      logger.error('Progressive rate limiter error:', error);
      next(); // Continue on error
    }
  };
};

module.exports = {
  defaultRateLimiter,
  authRateLimiter,
  sensitiveRateLimiter,
  apiRateLimiter,
  burstProtection,
  createUserRateLimiter,
  createProgressiveRateLimiter,
  RedisStore
}; 