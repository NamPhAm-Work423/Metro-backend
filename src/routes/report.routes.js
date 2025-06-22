const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const verifyToken = require('../middlewares/verifyToken');
const { checkRole } = require('../middlewares/role');

// Protected routes - require authentication and staff/admin role
router.use(verifyToken);
router.use(checkRole('staff', 'admin'));

// Staff routes
router.get('/daily', reportController.generateDailyReport);
router.get('/monthly', reportController.generateMonthlyReport);
router.get('/yearly', reportController.generateYearlyReport);
router.get('/revenue', reportController.generateRevenueReport);
router.get('/passengers', reportController.generatePassengerReport);
router.get('/station', reportController.generateStationReport);
router.get('/route', reportController.generateRouteReport);
router.get('/promotion', reportController.generatePromotionReport);
router.get('/staff', reportController.generateStaffReport);

// Admin routes
router.use(checkRole('admin'));
router.get('/export', reportController.exportReport);

module.exports = router; 