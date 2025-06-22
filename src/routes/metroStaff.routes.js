const express = require('express');
const router = express.Router();
const metroStaffController = require('../controllers/metroStaff.controller');
const verifyToken = require('../middlewares/verifyToken');
const { checkRole } = require('../middlewares/role');

// Protected routes - require authentication
router.use(verifyToken);

// Staff routes
router.get('/profile', metroStaffController.getStaffProfile);
router.put('/profile', metroStaffController.updateStaffProfile);
router.get('/schedule', metroStaffController.getAssignedSchedule);
router.post('/validate-ticket', metroStaffController.validateTicket);
router.post('/report-issue', metroStaffController.reportIssue);
router.get('/daily-report', metroStaffController.getDailyReport);
router.post('/handle-complaint', metroStaffController.handlePassengerComplaint);

module.exports = router; 