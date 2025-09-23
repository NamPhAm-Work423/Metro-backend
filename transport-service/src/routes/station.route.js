const express = require('express');
const router = express.Router();
const stationController = require('../controllers/station.controller');
const stopController = require('../controllers/stop.controller');
const routeStationController = require('../controllers/routeStation.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Get all stations (all roles)
router.get('/getAllStations', ...authorizeRoles('passenger', 'staff', 'admin'), stationController.getAllStations);

// Get active stations (all roles)
router.get('/getActiveStations', ...authorizeRoles('passenger', 'staff', 'admin'), stationController.getActiveStations);

// Get stations by operating hours (all roles)
router.get('/getStationsByOperatingHours', ...authorizeRoles('passenger', 'staff', 'admin'), stationController.getStationsByOperatingHours);

// Get next stops at station (all roles)
router.get('/getNextStopsAtStation/:stationId', ...authorizeRoles('passenger', 'staff', 'admin'), stopController.getNextStopsAtStation);

// Get routes by station (all roles)
router.get('/getRoutesByStation/:stationId', ...authorizeRoles('passenger', 'staff', 'admin'), routeStationController.getRoutesByStation);

// Get station by ID (all roles)
router.get('/getStationById/:id', ...authorizeRoles('passenger', 'staff', 'admin'), stationController.getStationById);

// Create station (admin only)
router.post('/createStation', ...authorizeRoles('admin'), stationController.createStation);

// Update station (admin only)
router.put('/updateStation/:id', ...authorizeRoles('admin'), stationController.updateStation);

// Update station facilities (admin only)
router.put('/updateStationFacilities/:id', ...authorizeRoles('admin'), stationController.updateStationFacilities);

// Delete station (admin only)
router.delete('/deleteStation/:id', ...authorizeRoles('admin'), stationController.deleteStation);

module.exports = router;
