const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { logger } = require('../config/logger');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const userService = require('../services/user.service');

const userController = {
  /**
   * @description: User registration
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - User registration response
   */
  signup: asyncErrorHandler(async (req, res) => {
    const { firstName, lastName, email, password, username, phoneNumber, dateOfBirth, gender, address } = req.body;

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
      roles: ['passenger'] //always passenger
    });

    // Remove password from response
    const { password: _, ...userResponse } = user.toJSON();

    res.status(201).json({
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
  login: asyncErrorHandler(async (req, res) => {
    const { email, password } = req.body;

    const { user, tokens } = await userService.login(email, password);

    // Remove password from response
    const { password: _, ...userResponse } = user.toJSON();

    logger.info('User logged in successfully', { userId: user.id, email });

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 60 * 60 * 1000
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        tokens: {
          ...tokens,
          expiresIn: '1h'
        }
      }
    });
  }),

  /**
   * @description: User logout
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - User logout response
   */
  logout: asyncErrorHandler(async (req, res, next) => {
    logger.info('User logged out', { userId: req.user.id });

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
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
        error: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    const { accessToken } = await userService.refreshToken(refreshToken);

    logger.info('Token refreshed successfully', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
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
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required',
        error: 'INVALID_REQUEST'
      });
    }

    await userService.resetPassword(token, password);

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  }),

  /**
   * @description: Verify email
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Verify email response
   */
  verifyEmail: asyncErrorHandler(async (req, res) => {
    const { token } = req.params;

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findByPk(decoded.userId);

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification token',
          error: 'INVALID_TOKEN'
        });
      }

      await user.update({ isVerified: true });

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
        error: 'INVALID_TOKEN'
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
};

module.exports = userController;
