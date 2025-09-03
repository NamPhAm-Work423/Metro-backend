const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');
const keyService = require('../services/key.service');

class AuthMiddleware {
  /**
   * Authenticate token
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next function
   */
  async authenticate(req, res, next) {
    let decoded = null;
    
    try {
      // Check for token in cookies first, then in Authorization header
      let token = req.cookies.accessToken;
      
      if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        }
      }
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token is required',
          error: 'ACCESS_TOKEN_REQUIRED'
        });
      }
      
      // Verify token
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      
      req.user = decoded;
      req.headers['x-user-id'] = decoded.userId ? decoded.userId.toString() : '';
      req.headers['x-user-email'] = decoded.email || '';
      req.headers['x-user-roles'] = JSON.stringify(decoded.roles || []);
      
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
          error: 'INVALID_TOKEN'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          error: 'TOKEN_EXPIRED'
        });
      }

      logger.error('Authentication error:', {
        error: error.message,
        stack: error.stack,
        userId: decoded?.userId || 'unknown',
        hasAuthHeader: !!req.headers.authorization
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  validateAPIKeyMiddleware = async (req, res, next) => {
    try {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          message: 'API key is required',
          error: 'API_KEY_REQUIRED'
        });
      }

      // Validate API key using key service
      const keyData = await keyService.validateAPIKey(apiKey);
      
      if (!keyData) {
        return res.status(401).json({
          success: false,
          message: 'Invalid API key',
          error: 'INVALID_API_KEY'
        });
      }

      // Add minimal user context from key metadata when available
      if (keyData.userId) {
        req.headers['x-user-id'] = keyData.userId.toString();
        req.user = { id: keyData.userId };
      }

      // API key is valid, proceed to next middleware
      next();
      
    } catch (error) {
      logger.error('API key validation error:', {
        error: error.message,
        stack: error.stack,
        apiKeyProvided: !!req.headers['x-api-key']
      });
      
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }


  // Check if user is verified
  requireVerified(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }

    if (!req.user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email address',
        error: 'EMAIL_NOT_VERIFIED'
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
          message: 'Too many requests. Please try again later.',
          error: 'TOO_MANY_REQUESTS'
        });
      }

      await redis.incr(key);
      next();
    } catch (error) {
      logger.error('Rate limit check error:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id || 'unknown',
        error: 'RATE_LIMIT_CHECK_ERROR'
      });
      // Continue on error to not block requests
      next();
    }
  }
}

module.exports = new AuthMiddleware(); 