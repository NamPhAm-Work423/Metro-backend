const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule.controller');
const verifyToken = require('../middlewares/verifyToken');
const { checkRole } = require('../middlewares/role');

// Public routes
router.get('/', scheduleController.getAllSchedules);
router.get('/:id', scheduleController.getScheduleById);
router.get('/route/:routeId', scheduleController.getScheduleByRoute);
router.get('/station/:stationId', scheduleController.getScheduleByStation);
router.get('/date', scheduleController.getScheduleByDate);
router.get('/time-range', scheduleController.getScheduleByTimeRange);

// Protected routes - require authentication
router.use(verifyToken);

// Admin routes
router.post('/', checkRole('admin'), scheduleController.createSchedule);
router.put('/:id', checkRole('admin'), scheduleController.updateSchedule);
router.delete('/:id', checkRole('admin'), scheduleController.deleteSchedule);
router.put('/:id/status', checkRole('admin'), scheduleController.updateScheduleStatus);

module.exports = router; 