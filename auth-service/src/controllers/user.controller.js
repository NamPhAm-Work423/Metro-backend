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
  signup: asyncErrorHandler(async (req, res) => {
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
      await userProducer.publishUserLogin({
        userId: user.id,
        email: user.email,
        username: user.username,
        roles: user.roles
      });

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
          // Use Lax during development so cookies are sent on cross-site requests from localhost:5173 → localhost:8000
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
      // Forward the error to the global error handler
      next(error);
    }
  }),

  /**
   * @description: User logout
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - User logout response
   */
  logout: asyncErrorHandler(async (req, res, next) => {
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
  }),

  /**
   * @description: Refresh token
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Refresh token response
   */
  refreshToken: asyncErrorHandler(async (req, res) => {
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
        error: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    const { accessToken, user } = await userService.refreshToken(refreshToken);

    logger.info('Token refreshed successfully', { userId: user.id });

    const userResponse = {
      email: user.email,
      username: user.username,
      roles: user.roles
    };

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user: userResponse,
        accessToken,
        expiresIn: '1h'
      }
    });
  }),

  /**
   * @description: Request password reset
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Request password reset response
   */
  forgotPassword: asyncErrorHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
        error: 'EMAIL_REQUIRED'
      });
    }

    await userService.forgotPassword(email);

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link'
    });
  }),

  /**
   * @description: Reset password
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Reset password response
   */
  resetPassword: asyncErrorHandler(async (req, res) => {
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
  }),

  /**
   * @description: Verify email from query parameter (for clickable links)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Verify email response
   */
  verifyEmailFromQuery: asyncErrorHandler(async (req, res) => {
    const token = req.query?.token || req.body?.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
        error: 'TOKEN_REQUIRED'
      });
    }

    try {
      const result = await userService.verifyEmailToken(token);

      if (!result.success) {
        // Return error HTML page for better UX
        return res.status(400).json({
          success: false,
          message: 'Verification failed',
          error: 'VERIFICATION_FAILED'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      // Return error HTML page for better UX
      res.status(400).json({
        success: false,
        message: 'Verification failed',
        error: 'VERIFICATION_FAILED'
      });
    }
  }),

  /**
   * @description: Verify token
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Verify token response
   */
  verifyToken: asyncErrorHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user
      }
    });
  }),

  /**
   * @description: Unlock user account (Admin only)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Unlock account response
   */
  unlockAccount: asyncErrorHandler(async (req, res) => {
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
        error: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Account unlocked successfully',
      data: result.data
    });
  }),
};

module.exports = userController;
