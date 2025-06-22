const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const verifyToken = require('../middlewares/verifyToken');
const { checkRole } = require('../middlewares/role');

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes - require authentication
router.use(verifyToken);

// User routes
router.get('/profile', userController.getUserProfile);
router.put('/profile', userController.updateUserProfile);

// Admin routes
router.use(checkRole('admin'));
router.delete('/:id', userController.deleteUser);

module.exports = router; 