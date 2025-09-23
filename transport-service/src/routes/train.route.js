const express = require('express');
const router = express.Router();
const trainController = require('../controllers/train.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Get all trains (staff and admin)
router.get('/getAllTrains', ...authorizeRoles('staff', 'admin'), trainController.getAllTrains);

// Get active trains (all roles)
router.get('/getActiveTrains', ...authorizeRoles('passenger', 'staff', 'admin'), trainController.getActiveTrains);

// Get trains by type (all roles)
router.get('/getTrainsByType/:type', ...authorizeRoles('passenger', 'staff', 'admin'), trainController.getTrainsByType);

// Get trains by status (staff and admin)
router.get('/getTrainsByStatus/:status', ...authorizeRoles('staff', 'admin'), trainController.getTrainsByStatus);

// Get trains needing maintenance (admin only)
router.get('/getTrainsNeedingMaintenance', ...authorizeRoles('admin'), trainController.getTrainsNeedingMaintenance);

// Get train by ID (staff and admin)
router.get('/getTrainById/:id', ...authorizeRoles('staff', 'admin'), trainController.getTrainById);

// Get train utilization (admin only)
router.get('/getTrainUtilization/:id', ...authorizeRoles('admin'), trainController.getTrainUtilization);

// Create train (admin only)
router.post('/createTrain', ...authorizeRoles('admin'), trainController.createTrain);

// Update train (admin only)
router.put('/updateTrain/:id', ...authorizeRoles('admin'), trainController.updateTrain);

// Update train status (staff and admin)
router.put('/updateTrainStatus/:id', ...authorizeRoles('staff', 'admin'), trainController.updateTrainStatus);

// Schedule maintenance (admin only)
router.post('/scheduleTrainMaintenance/:id', ...authorizeRoles('admin'), trainController.scheduleTrainMaintenance);

// Delete train (admin only)
router.delete('/deleteTrain/:id', ...authorizeRoles('admin'), trainController.deleteTrain);

module.exports = router;
