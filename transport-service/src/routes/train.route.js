const express = require('express');
const router = express.Router();
const trainController = require('../controllers/train.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Get all trains (staff and admin)
router.get('/', ...authorizeRoles('staff', 'admin'), trainController.getAllTrains);

// Get active trains (all roles)
router.get('/active', ...authorizeRoles('passenger', 'staff', 'admin'), trainController.getActiveTrains);

// Get trains by type (all roles)
router.get('/type/:type', ...authorizeRoles('passenger', 'staff', 'admin'), trainController.getTrainsByType);

// Get trains by status (staff and admin)
router.get('/status/:status', ...authorizeRoles('staff', 'admin'), trainController.getTrainsByStatus);

// Get trains needing maintenance (admin only)
router.get('/maintenance/needed', ...authorizeRoles('admin'), trainController.getTrainsNeedingMaintenance);

// Get train by ID (staff and admin)
router.get('/:id', ...authorizeRoles('staff', 'admin'), trainController.getTrainById);

// Get train utilization (admin only)
router.get('/:id/utilization', ...authorizeRoles('admin'), trainController.getTrainUtilization);

// Create train (admin only)
router.post('/', ...authorizeRoles('admin'), trainController.createTrain);

// Update train (admin only)
router.put('/:id', ...authorizeRoles('admin'), trainController.updateTrain);

// Update train status (staff and admin)
router.put('/:id/status', ...authorizeRoles('staff', 'admin'), trainController.updateTrainStatus);

// Schedule maintenance (admin only)
router.post('/:id/maintenance', ...authorizeRoles('admin'), trainController.scheduleTrainMaintenance);

// Delete train (admin only)
router.delete('/:id', ...authorizeRoles('admin'), trainController.deleteTrain);

module.exports = router;
