const express = require('express');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authController = require('../controllers/auth.controller');
const router = express.Router();


router.post('/register', userController.signup);

router.post('/login', userController.login);

router.post('/logout', authMiddleware.authenticate, userController.logout);

router.post('/refresh', userController.refreshToken);

router.post('/forgot-password', userController.forgotPassword);

router.post('/reset-password', userController.resetPassword);

router.get('/verify/:token', userController.verifyEmail);

router.get('/verify-email', userController.verifyEmailFromQuery);

/**Those routes will not be used in the future, but we keep them for now */
router.get('/key/:id', authMiddleware.authenticate, authController.generateAPIToken);


router.get('/keys/:userId', authMiddleware.authenticate, authController.getAPIKeyByUser);


router.delete('/key/:id', authMiddleware.authenticate, authController.deleteKeyById);

module.exports = router;