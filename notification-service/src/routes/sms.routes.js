const express = require('express');
const router = express.Router();
const smsController = require('../controllers/sms.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Get all SMS with pagination and filters
router.get('/getAllSMS', ...authorizeRoles('admin'), smsController.getSMS);

// Get SMS statistics
router.get('/getSMSStats', ...authorizeRoles('admin'), smsController.getSMSStats);

// Get SMS cost analysis
router.get('/getSMSCosts', ...authorizeRoles('admin'), smsController.getSMSCosts);

// Get SMS by ID
router.get('/getSMSById/:id', ...authorizeRoles('admin'), smsController.getSMSById);

// Get SMS timeline
router.get('/getSMSTimeline/:id', ...authorizeRoles('admin'), smsController.getSMSTimeline);

// Get SMS by recipient
router.get('/getSMSByRecipient/:recipient', ...authorizeRoles('admin'), smsController.getSMSByRecipient);

// Retry failed SMS
router.post('/retrySMS/:id', ...authorizeRoles('admin'), smsController.retrySMS);

module.exports = router;
