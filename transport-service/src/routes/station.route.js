const express = require('express');
const router = express.Router();
const stationController = require('../controllers/station.controller');
const stopController = require('../controllers/stop.controller');
const routeStationController = require('../controllers/routeStation.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Get all stations (all roles)
router.get('/', ...authorizeRoles('passenger', 'staff', 'admin'), stationController.getAllStations);

// Get active stations (all roles)
router.get('/active', ...authorizeRoles('passenger', 'staff', 'admin'), stationController.getActiveStations);

// Get stations by operating hours (all roles)
router.get('/operating/current', ...authorizeRoles('passenger', 'staff', 'admin'), stationController.getStationsByOperatingHours);

// Get next stops at station (all roles)
router.get('/:stationId/next-stops', ...authorizeRoles('passenger', 'staff', 'admin'), stopController.getNextStopsAtStation);

// Get routes by station (all roles)
router.get('/:stationId/routes', ...authorizeRoles('passenger', 'staff', 'admin'), routeStationController.getRoutesByStation);

// Get station by ID (all roles)
router.get('/:id', ...authorizeRoles('passenger', 'staff', 'admin'), stationController.getStationById);

// Create station (admin only)
router.post('/', ...authorizeRoles('admin'), stationController.createStation);

// Update station (admin only)
router.put('/:id', ...authorizeRoles('admin'), stationController.updateStation);

// Update station facilities (admin only)
router.put('/:id/facilities', ...authorizeRoles('admin'), stationController.updateStationFacilities);

// Delete station (admin only)
router.delete('/:id', ...authorizeRoles('admin'), stationController.deleteStation);

module.exports = router;
