const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Admin/Staff management routes
router.get('/getAllStaff', ...authorizeRoles('staff','admin'), staffController.getAllStaff);
router.get('/getStaffById/:id', ...authorizeRoles('staff','admin'), staffController.getStaffById);
router.post('/createStaff', ...authorizeRoles('staff','admin'), staffController.createStaff);
router.put('/updateStaff/:id', ...authorizeRoles('staff','admin'), staffController.updateStaff);
router.delete('/deleteStaff/:id', ...authorizeRoles('staff','admin'), staffController.deleteStaff);
router.put('/updateStaffStatus/:id', ...authorizeRoles('admin'), staffController.updateStaffStatus);

// Staff self-service routes
router.get('/me', ...authorizeRoles('staff'), staffController.getMe);
router.put('/me', ...authorizeRoles('staff'), staffController.updateMe);
router.delete('/me', ...authorizeRoles('staff'), staffController.deleteMe);

module.exports = router; 