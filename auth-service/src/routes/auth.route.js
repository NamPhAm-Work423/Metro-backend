const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authController = require('../controllers/auth.controller');
const { requireSession } = require('../config/session');
const router = express.Router();

// Auth operations
router.post('/register', userController.signup);

router.post('/login', userController.login);

router.post('/logout', authMiddleware.authenticate, userController.logout);

router.post('/refresh', userController.refreshToken);

// Session refresh endpoint (alternative to JWT refresh)
router.post('/session-refresh', requireSession, async (req, res) => {
  try {
    // Session is automatically extended due to rolling: true
    // Just update the lastActivity timestamp
    req.session.lastActivity = new Date().toISOString();

    res.status(200).json({
      success: true,
      message: 'Session refreshed successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Session status endpoint (can work with both JWT and Session)
router.get('/status', async (req, res) => {
  try {
    // Check for JWT authentication first
    if (req.user) {
      return res.status(200).json({
        success: true,
        authenticated: true,
        method: 'jwt',
        user: {
          id: req.user.id,
          email: req.user.email,
          username: req.user.username,
          roles: req.user.roles
        }
      });
    }
    
    // Check for session authentication
    if (req.session && req.session.userId) {
      return res.status(200).json({
        success: true,
        authenticated: true,
        method: 'session',
        user: {
          id: req.session.userId,
          email: req.session.userEmail,
          role: req.session.userRole
        },
        session: {
          createdAt: req.session.createdAt,
          lastActivity: req.session.lastActivity
        }
      });
    }

    // Not authenticated
    return res.status(401).json({
      success: false,
      authenticated: false,
      message: 'Not authenticated'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Sensitive operations
router.post('/forgot-password', userController.forgotPassword);

router.post('/reset-password', userController.resetPassword);

// Email verification
router.get('/verify/:token', userController.verifyEmail);

router.get('/verify-email', userController.verifyEmailFromQuery);

/**Those routes will not be used in the future, but we keep them for now */
router.get('/key/:id', authMiddleware.authenticate, authController.generateAPIToken);

router.get('/keys/:userId', authMiddleware.authenticate, authController.getAPIKeyByUser);

router.delete('/key/:id', authMiddleware.authenticate, authController.deleteKeyById);

// Session-only protected routes (alternative to JWT authentication)
router.get('/profile', requireSession, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        id: req.session.userId,
        email: req.session.userEmail,
        role: req.session.userRole
      },
      session: {
        createdAt: req.session.createdAt,
        lastActivity: req.session.lastActivity
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;