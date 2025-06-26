const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Admin management routes (super admin only)
router.get('/getAllAdmins', ...authorizeRoles('admin'), adminController.getAllAdmins);
router.get('/getAdminById/:id', ...authorizeRoles('admin'), adminController.getAdminById);
router.put('/updateAdmin/:id', ...authorizeRoles('admin'), adminController.updateAdmin);

// Admin self-service routes
router.get('/me', ...authorizeRoles('admin'), adminController.getMe);

module.exports = router; 