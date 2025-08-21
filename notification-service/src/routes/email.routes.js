const express = require('express');
const router = express.Router();
const emailController = require('../controllers/email.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Get all emails with pagination and filters
router.get('/getAllEmails', ...authorizeRoles('admin'), emailController.getEmails);

// Get email statistics
router.get('/getEmailStats', ...authorizeRoles('admin'), emailController.getEmailStats);

// Get email by ID
router.get('/getEmailById/:id', ...authorizeRoles('admin'), emailController.getEmailById);

// Get email timeline
router.get('/getEmailTimeline/:id', ...authorizeRoles('admin'), emailController.getEmailTimeline);

// Get emails by recipient
router.get('/getEmailByRecipient/:recipient', ...authorizeRoles('admin'), emailController.getEmailsByRecipient);

// Retry failed email
router.post('/retryEmail/:id', ...authorizeRoles('admin'), emailController.retryEmail);

module.exports = router;
