const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const verifyToken = require('../middlewares/verifyToken');
const { checkRole } = require('../middlewares/role');

console.log('DEBUG verifyToken:', verifyToken, typeof verifyToken);
console.log('DEBUG checkRole:', checkRole, typeof checkRole);

// Protected routes - require authentication and admin role
router.use(verifyToken, checkRole('admin'));

// Admin routes
router.get('/dashboard', adminController.getDashboardStats);
router.get('/users', adminController.manageUsers);
router.get('/staff', adminController.manageStaff);
router.get('/routes', adminController.manageRoutes);
router.get('/schedules', adminController.manageSchedules);
router.get('/fares', adminController.manageFares);
router.get('/promotions', adminController.managePromotions);
router.get('/reports', adminController.generateReports);
router.get('/settings', adminController.systemSettings);
router.put('/settings', adminController.systemSettings);

module.exports = router; 