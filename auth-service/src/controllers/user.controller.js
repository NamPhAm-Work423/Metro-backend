const { logger } = require('../config/logger');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const userService = require('../services/user.service');
const userProducer = require('../events/user.producer.event');
const { createUserSession, destroyUserSession } = require('../config/session');


const userController = {
  /**
   * @description: User registration
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - User registration response
   */
  signup: asyncErrorHandler(async (req, res, next) => {
    try {
      const { firstName, lastName, email, password, username, phoneNumber, dateOfBirth, gender, address, roles, isVerified } = req.body;

      const { user } = await userService.signup({
        firstName,
        lastName,
        email,
        password,
        username,
        phoneNumber,
        dateOfBirth,
        gender,
        address,
        roles: roles || ['passenger']
      });
      //If in roles have admin, reject create user
      if (Array.isArray(roles) && roles.includes('admin')) {
        return res.status(400).json({
          success: false,
          message: 'Admin role is not allowed to be created',
          error: 'ADMIN_ROLE_NOT_ALLOWED'
        });
      }
      // Remove all fields from response except email, username, and roles
      const userResponse = {
        email: user.email,
        username: user.username,
        roles: user.roles
      };

      res.status(200).json({
        success: true,
        message: 'User registered successfully. Please verify your email to activate your account.',
        data: {
          user: userResponse
        }
      });
    } catch (error) {
      if (error.message === 'Email already exists') {
        return res.status(409).json({
            success: false,
            message: 'Email already exists',
            error: 'DUPLICATE_EMAIL'
        });
      }
      
      if (error.message === 'Username already exists') {
          return res.status(409).json({
              success: false,
              message: 'Username already exists',
              error: 'DUPLICATE_USERNAME'
          });
      }
      
      if (error.message === 'Admin role is not allowed to be created') {
          return res.status(400).json({
              success: false,
              message: 'Admin role is not allowed to be created',
              error: 'ADMIN_ROLE_NOT_ALLOWED'
          });
      }
      
      logger.error('Registration system error:', error);
      res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: 'INTERNAL_ERROR_SIGNUP'
      });
    }
  }),

  /**
   * @description: User login
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - User login response
   */
  login: asyncErrorHandler(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const { user, tokens } = await userService.login(email, password);

      // Remove all fields from response except email, username, and roles
      const userResponse = {
        email: user.email,
        username: user.username,
        roles: user.roles
      };

      logger.info('User logged in successfully', { userId: user.id, email });

      // Create session for user (in addition to JWT)
      logger.debug('About to create user session', {
        hasSession: !!req.session,
        sessionId: req.sessionID,
        userId: user.id,
        userRole: user.role
      });
      
      createUserSession(req, user);
      
      // Verify session was created
      logger.debug('Session creation verification', {
        hasSession: !!req.session,
        sessionId: req.sessionID,
        sessionKeys: req.session ? Object.keys(req.session) : [],
        hasUserId: req.session ? !!req.session.userId : false,
        userId: req.session ? req.session.userId : null
      });


      //If flag is true, send access token to client
      if(process.env.SEND_ACCESS_TOKEN_TO_CLIENT === 'false'){
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          maxAge: 60 * 60 * 1000,
          path: '/'
      });
      }
      //Store refresh token in cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          accessToken: process.env.SEND_ACCESS_TOKEN_TO_CLIENT === 'true' ? tokens.accessToken : null
        }
      });
    } catch (error) {
      // Clear any existing cookies on login failure
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      // Map known service errors to HTTP responses
      if (error.message === 'User is not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND_LOGIN'
        });
      }

      if (error.message === 'Account is temporarily locked due to multiple failed login attempts') {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to multiple failed login attempts',
          error: 'ACCOUNT_LOCKED_LOGIN'
        });
      }

      if (error.message === 'Please verify your email address') {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email address',
          error: 'EMAIL_NOT_VERIFIED_LOGIN'
        });
      }

      if (error.message === 'Password is required') {
        return res.status(400).json({
          success: false,
          message: 'Password is required',
          error: 'PASSWORD_REQUIRED_LOGIN'
        });
      }

      if (error.message === 'Invalid email or password') {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS_LOGIN'
        });
      }

      logger.error('Login system error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR_LOGIN'
      });
    }
  }),

  /**
   * @description: User logout
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - User logout response
   */
  logout: asyncErrorHandler(async (req, res, next) => {
    try {
      logger.info('User logged out', { userId: req.user.id });

      // Destroy session (in addition to clearing JWT cookies)
      destroyUserSession(req);

      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/'
      });

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/'
      });

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }),

  /**
   * @description: Refresh token
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Refresh token response
   */
  refreshToken: asyncErrorHandler(async (req, res, next) => {
    try {
        //check in cookie if refresh token is present
        const refreshToken = req.cookies.refreshToken;

        // Debug logging
        logger.debug('Refresh token request debug', {
          hasCookies: !!req.cookies,
          cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
          hasRefreshToken: !!refreshToken,
          userAgent: req.get('User-Agent'),
          origin: req.get('Origin')
        });

        if(!refreshToken){
          return res.status(401).json({
            success: false,
            message: 'Refresh token is required',
            error: 'REFRESH_TOKEN_REQUIRED_REFRESH_TOKEN'
          });
        }

        const { accessToken, user } = await userService.refreshToken(refreshToken);

        logger.info('Token refreshed successfully', { userId: user.id });

        const userResponse = {
          email: user.email,
          username: user.username,
          roles: user.roles
        };

        // If flag is false, send access token via cookie only
        if(process.env.SEND_ACCESS_TOKEN_TO_CLIENT === 'false'){
          res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 60 * 60 * 1000, // 1 hour
            path: '/'
          });
        }

        res.json({
          success: true,
          message: 'Token refreshed successfully',
          data: {
            user: userResponse,
            accessToken: process.env.SEND_ACCESS_TOKEN_TO_CLIENT === 'true' ? accessToken : null,
            expiresIn: '1h'
          }
        });
    } catch (error) {
      // Clear potentially invalid tokens
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      if (error && error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Refresh token expired',
          error: 'REFRESH_TOKEN_EXPIRED_REFRESH_TOKEN'
        });
      }

      if (error && (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
          error: 'INVALID_REFRESH_TOKEN_REFRESH_TOKEN'
        });
      }

      if (error && error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND_REFRESH_TOKEN'
        });
      }

      logger.error('Refresh token system error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR_REFRESH_TOKEN'
      });
    }
  }),

  /**
   * @description: Request password reset
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Request password reset response
   */
  forgotPassword: asyncErrorHandler(async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
          return res.status(400).json({
            success: false,
            message: 'Email is required',
            error: 'EMAIL_REQUIRED_FORGOT_PASSWORD'
          });
        }

        await userService.forgotPassword(email);

        res.json({
          success: true,
          message: 'If an account exists with this email, you will receive a password reset link'
        });
    } catch (error) {
      if (error.message === 'Failed to generate password reset token - Redis unavailable') {
        return res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable',
          error: 'REDIS_UNAVAILABLE_FORGOT_PASSWORD'
        });
      }

      logger.error('Forgot password system error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR_FORGOT_PASSWORD'
      });
    }
  }),

  /**
   * @description: Reset password
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Reset password response
   */
  resetPassword: asyncErrorHandler(async (req, res, next) => {
    try {
        const { token, uid, newPassword } = req.body;

        if (!token || !uid || !newPassword) {
          return res.status(400).json({
            success: false,
            message: 'Token, user ID, and new password are required',
            error: 'INVALID_REQUEST'
          });
        }

        await userService.resetPassword(token, uid, newPassword);

        res.json({
          success: true,
          message: 'Password reset successful'
        });
    } catch (error) {
      if (error.message === 'Password must be at least 6 characters') {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters',
          error: 'WEAK_PASSWORD_RESET_PASSWORD'
        });
      }

      if (error.message === 'Failed to verify reset token - Redis unavailable') {
        return res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable',
          error: 'REDIS_UNAVAILABLE_RESET_PASSWORD'
        });
      }

      if (error.message === 'Invalid or expired reset token') {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
          error: 'INVALID_OR_EXPIRED_TOKEN_RESET_PASSWORD'
        });
      }

      if (error.message === 'Invalid reset token') {
        return res.status(400).json({
          success: false,
          message: 'Invalid reset token',
          error: 'INVALID_RESET_TOKEN_RESET_PASSWORD'
        });
      }

      logger.error('Reset password system error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR_RESET_PASSWORD'
      });
    }
  }),

  /**
   * @description: Verify email from query parameter (for clickable links)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Verify email response
   */
  verifyEmailFromQuery: asyncErrorHandler(async (req, res, next) => {
    try {
        const token = req.query?.token || req.body?.token;

        if (!token) {
          return res.status(400).json({
            success: false,
            message: 'Verification token is required',
            error: 'TOKEN_REQUIRED_VERIFY_EMAIL_FROM_QUERY'
          });
        }

        const result = await userService.verifyEmailToken(token);

        if (!result.success) {
          return res.status(400).json({
            success: false,
            message: 'Verification failed',
            error: 'VERIFICATION_FAILED_VERIFY_EMAIL_FROM_QUERY'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Email verified successfully'
        });
    } catch (error) {
      next(error);
    }
  }),


  /**
   * @description: Unlock user account (Admin only)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Unlock account response
   */
  unlockAccount: asyncErrorHandler(async (req, res, next) => {
    try {
        const { userId } = req.params;

        if (!userId) {
          return res.status(400).json({
            success: false,
            message: 'User ID is required',
            error: 'INVALID_REQUEST'
          });
        }

        const result = await userService.unlockUserAccount(userId, req.user?.id);
        
        if (!result.success) {
          return res.status(404).json({
            success: false,
            message: result.message,
            error: 'USER_NOT_FOUND_UNLOCK_ACCOUNT'
          });
        }

        res.json({
          success: true,
          message: 'Account unlocked successfully',
          data: result.data
    });
    } catch (error) {
      next(error);
    }
  }),

  resendVerification: asyncErrorHandler(async (req, res, next) => {
    try {
      const { email } = req.body;

      // Validate email
      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
          error: 'EMAIL_REQUIRED_RESEND_VERIFICATION'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
          error: 'INVALID_EMAIL_FORMAT'
        });
      }

      const result = await userService.resendVerification(email.trim());

      return res.status(200).json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (error) {
      logger.error('Error resending verification email', { error: error.message, email: req.body?.email });
      
      // Handle specific error cases
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND_RESEND_VERIFICATION'
        });
      }

      if (error.message === 'User is already verified') {
        return res.status(400).json({
          success: false,
          message: 'User is already verified',
          error: 'USER_ALREADY_VERIFIED_RESEND_VERIFICATION'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error resending verification email',
        error: 'INTERNAL_SERVER_ERROR_RESEND_VERIFICATION'
      });

      next(error);
    }
  })
};

module.exports = userController;
