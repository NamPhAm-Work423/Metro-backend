const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authController = require('../controllers/auth.controller');
const { authRateLimiter, sensitiveRateLimiter, defaultRateLimiter } = require('../middlewares/rateLimiter');
const router = express.Router();

// Auth operations with stricter rate limiting
router.post('/register', authRateLimiter, userController.signup);

router.post('/login', authRateLimiter, userController.login);

router.post('/logout', defaultRateLimiter, authMiddleware.authenticate, userController.logout);

router.post('/refresh', authRateLimiter, userController.refreshToken);

// Sensitive operations with the most restrictive rate limiting
router.post('/forgot-password', sensitiveRateLimiter, userController.forgotPassword);

router.post('/reset-password', sensitiveRateLimiter, userController.resetPassword);

// Email verification with standard rate limiting
router.get('/verify/:token', defaultRateLimiter, userController.verifyEmail);

router.get('/verify-email', defaultRateLimiter, userController.verifyEmailFromQuery);

/**Those routes will not be used in the future, but we keep them for now */
router.get('/key/:id', defaultRateLimiter, authMiddleware.authenticate, authController.generateAPIToken);

router.get('/keys/:userId', defaultRateLimiter, authMiddleware.authenticate, authController.getAPIKeyByUser);

router.delete('/key/:id', defaultRateLimiter, authMiddleware.authenticate, authController.deleteKeyById);

module.exports = router;