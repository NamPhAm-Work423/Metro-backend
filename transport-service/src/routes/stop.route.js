const express = require('express');
const router = express.Router();
const stopController = require('../controllers/stop.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Get all stops (staff and admin)
router.get('/', ...authorizeRoles('staff', 'admin'), stopController.getAllStops);

// Get stops by trip (all roles)
router.get('/trip/:tripId', ...authorizeRoles('passenger', 'staff', 'admin'), stopController.getStopsByTrip);

// Get stops by station (all roles)
router.get('/station/:stationId', ...authorizeRoles('passenger', 'staff', 'admin'), stopController.getStopsByStation);

// Get stop by ID (staff and admin)
router.get('/:id', ...authorizeRoles('staff', 'admin'), stopController.getStopById);

// Create stop (admin only)
router.post('/', ...authorizeRoles('admin'), stopController.createStop);

// Create multiple stops (admin only)
router.post('/multiple', ...authorizeRoles('admin'), stopController.createMultipleStops);

// Update stop (admin only)
router.put('/:id', ...authorizeRoles('admin'), stopController.updateStop);

// Delete stop (admin only)
router.delete('/:id', ...authorizeRoles('admin'), stopController.deleteStop);

module.exports = router;
