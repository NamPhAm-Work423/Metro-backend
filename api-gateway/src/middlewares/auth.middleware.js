const jwt = require('jsonwebtoken');
const { User } = require('../models/index.model');
const config = require('..');
const logger = require('../config/logger');

class AuthMiddleware {
  // Authenticate token
  async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access token is required'
        });
      }

      const token = authHeader.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Get user from database
      const user = await User.findByPk(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is verified
      if (!user.isVerified) {
        return res.status(401).json({
          success: false,
          message: 'Please verify your email address'
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked'
        });
      }

      // Add user to request object
      req.user = user;
      
      // Add user context headers for downstream services
      req.headers['x-user-id'] = user.id.toString();
      req.headers['x-user-email'] = user.email;
      req.headers['x-user-roles'] = JSON.stringify(user.roles);
      
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }

      logger.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  validateAPIKeyMiddleware = async (req, res, next) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          message: 'API key is required'
        });
      }
      const redisData = await validateAPIKey(apiKey);
      if (redisData) {
        return next();
      }
      const hashKey = hashToken(apiKey);
      const key = await Key.findOne({ 
        where: { 
          value: hashKey,
          isActive: true
        }
      });
      if (!key) {
        return res.status(401).json({
          success: false,
          message: 'Invalid API key'
        });
        
        await storeAPIKey(apiKey);
        next();
      }
    } catch (error) {
      logger.error('API key validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }


  // Authorize roles
  authorize(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user has any of the required roles
      const hasRole = roles.some(role => req.user.roles.includes(role));
      
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  // Check if user is verified
  requireVerified(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!req.user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email address'
      });
    }

    next();
  }

  // Check if user is admin
  requireAdmin(req, res, next) {
    return this.authorize('admin')(req, res, next);
  }


  // Rate limiting for sensitive operations
  async checkUserRateLimit(req, res, next) {
    try {
      const redis = require('../config/redis');
      const key = `rate_limit:sensitive:${req.user.id}`;
      const limit = 10; // 10 requests
      const window = 300; // 5 minutes

      const current = await redis.get(key);
      
      if (current === null) {
        await redis.setex(key, window, 1);
        return next();
      }

      if (parseInt(current) >= limit) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.'
        });
      }

      await redis.incr(key);
      next();
    } catch (error) {
      logger.error('Rate limit check error:', error);
      // Continue on error to not block requests
      next();
    }
  }
}

module.exports = new AuthMiddleware(); 