const rateLimit = require('express-rate-limit');
const { getClient } = require('../config/redis');
const config = require('..');
const { logger } = require('../config/logger');

// Redis store for rate limiter using clean tree structure
class RedisStore {
  constructor(options = {}) {
    // Follow clean tree structure: rate-limiter:{type}:{key}
    this.keyPrefix = options.prefix || 'rate-limiter:';
    this.windowMs = options.windowMs || 60000;
  }

  /**
   * Get Redis client
   */
  getRedisClient() {
    return getClient();
  }

  /**
   * Increment the rate limiter
   * @param {string} key - The key to increment
   * @returns {Promise<{totalHits: number, resetTime: Date}>} - The total hits and reset time
   */
  async increment(key) {
    try {
      const redis = this.getRedisClient();
      if (!redis || redis.isOpen === false) {
        logger.warn('Redis client not available, allowing request');
        return {
          totalHits: 1,
          resetTime: new Date(Date.now() + this.windowMs)
        };
      }

      const fullKey = this.keyPrefix + key;
      const current = await redis.incr(fullKey);
      
      if (current === 1) {
        await redis.expire(fullKey, Math.ceil(this.windowMs / 1000));
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

  /**
   * Decrement the rate limiter
   * @param {string} key - The key to decrement
   */
  async decrement(key) {
    try {
      const redis = this.getRedisClient();
      if (!redis || redis.isOpen === false) {
        return;
      }

      const fullKey = this.keyPrefix + key;
      await redis.decr(fullKey);
    } catch (error) {
      logger.error('Redis rate limiter decrement error:', error);
    }
  }

  /**
   * Reset the rate limiter
   * @param {string} key - The key to reset
   */
  async resetKey(key) {
    try {
      const redis = this.getRedisClient();
      if (!redis) {
        return;
      }

      const fullKey = this.keyPrefix + key;
      await redis.del(fullKey);
    } catch (error) {
      logger.error('Redis rate limiter reset error:', error);
    }
  }
}

// Key generator function
/**
 * Generate a key for the rate limiter
 * @param {Request} req - The request object
 * @returns {string} - The key
 */
const keyGenerator = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
  const userId = req.user?.id || 'anonymous';
  return `${ip}:${userId}`;
};

// Skip function for successful requests
/**
 * Skip function for successful requests
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @returns {boolean} - Whether to skip the request
 */
const skipSuccessfulRequests = (req, res) => res.statusCode < 400;

// Handler function to replace deprecated onLimitReached
const handleLimitReached = (req, res, options) => {
  logger.warn('Rate limit reached', {
    ip: req.ip,
    userId: req.user?.id,
    endpoint: req.originalUrl,
    method: req.method,
    userAgent: req.headers['user-agent']
  });
};

// Default rate limiter
/**
 * Default rate limiter
 * @type {rateLimit}
 */
const defaultRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rate-limiter:default:',
    windowMs: 15 * 60 * 1000
  }),
  keyGenerator,
  skipSuccessfulRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  handler: (req, res, next, options) => {
    handleLimitReached(req, res, options);
    res.status(options.statusCode).json(options.message);
  }
});

// Authentication rate limiter (stricter for auth endpoints)
/**
 * Authentication rate limiter (stricter for auth endpoints)
 * @type {rateLimit}
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rate-limiter:auth:',
    windowMs: 15 * 60 * 1000
  }),
  keyGenerator,
  skipSuccessfulRequests: false, // Count all auth attempts
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  handler: (req, res, next, options) => {
    logger.warn('Auth rate limit reached', {
      ip: req.ip,
      userId: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent']
    });
    res.status(options.statusCode).json(options.message);
  }
});

// Sensitive operations rate limiter (password reset, etc.)
/**
 * Sensitive operations rate limiter (password reset, etc.)
 * @type {rateLimit}
 */
const sensitiveRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 sensitive requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rate-limiter:sensitive:',
    windowMs: 60 * 60 * 1000
  }),
  keyGenerator,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many sensitive operations, please try again later.'
  },
  handler: (req, res, next, options) => {
    logger.warn('Sensitive operations rate limit reached', {
      ip: req.ip,
      userId: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent']
    });
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * API rate limiter (for external APIs)
 * @type {rateLimit}
 */
const apiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit each IP to 1000 API requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rate-limiter:api:',
    windowMs: 60 * 60 * 1000
  }),
  keyGenerator,
  skipSuccessfulRequests,
  message: {
    success: false,
    message: 'API rate limit exceeded, please try again later.'
  },
  handler: (req, res, next, options) => {
    logger.warn('API rate limit reached', {
      ip: req.ip,
      userId: req.user?.id,
      endpoint: req.originalUrl,
      method: req.method,
      userAgent: req.headers['user-agent']
    });
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Create a user rate limiter
 * @param {number} windowMs - The window in milliseconds
 * @param {number} max - The maximum number of requests
 * @returns {rateLimit} - The rate limiter
 */
const createUserRateLimiter = (windowMs = 60 * 1000, max = 60) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      prefix: 'rate-limiter:user:',
      windowMs
    }),
    keyGenerator: (req) => req.user?.id || req.ip,
    skipSuccessfulRequests,
    message: {
      success: false,
      message: 'User rate limit exceeded, please slow down.'
    },
    skip: (req) => !req.user, // Skip if user not authenticated
    handler: (req, res, next, options) => {
      logger.warn('User rate limit reached', {
        userId: req.user?.id,
        endpoint: req.originalUrl,
        method: req.method
      });
      res.status(options.statusCode).json(options.message);
    }
  });
};

/**
 * Burst protection (very short window, high limit)
 * @type {rateLimit}
 */
const burstProtection = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // 10 requests per second
  standardHeaders: false,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rate-limiter:burst:',
    windowMs: 1000
  }),
  keyGenerator,
  skipSuccessfulRequests,
  message: {
    success: false,
    message: 'Too many requests in a short time, please slow down.'
  }
});

/**
 * Progressive rate limiter (increases penalty for repeated violations)
 * @param {number} baseWindowMs - The base window in milliseconds
 * @param {number} baseMax - The base maximum number of requests
 * @returns {rateLimit} - The rate limiter
 */
const createProgressiveRateLimiter = (baseWindowMs = 15 * 60 * 1000, baseMax = 100) => {
  return async (req, res, next) => {
    try {
      const redis = getClient();
      if (!redis) {
        return next(); // Continue if Redis not available
      }

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
          prefix: 'rate-limiter:progressive:',
          windowMs: adjustedWindow
        }),
        keyGenerator,
        message: {
          success: false,
          message: `Rate limit exceeded. Current limit: ${adjustedMax} requests per ${Math.round(adjustedWindow / 60000)} minutes.`
        },
        handler: async (req, res, next, options) => {
          // Increment violation count
          await redis.setEx(violationKey, 24 * 60 * 60, parseInt(violations) + 1); // 24 hour expiry
          res.status(options.statusCode).json(options.message);
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