const express = require('express');
const router = express.Router();
const routeStationController = require('../controllers/routeStation.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Get all route-stations (staff and admin)
router.get('/', ...authorizeRoles('staff', 'admin'), routeStationController.getAllRouteStations);

// Search routes between stations (all roles)
router.get('/search/between-stations', ...authorizeRoles('passenger', 'staff', 'admin'), routeStationController.findRoutesBetweenTwoStations);

// Get route-station by ID (staff and admin)
router.get('/:id', ...authorizeRoles('staff', 'admin'), routeStationController.getRouteStationById);

// Create route-station (admin only)
router.post('/', ...authorizeRoles('admin'), routeStationController.createRouteStation);

// Update route-station (admin only)
router.put('/:id', ...authorizeRoles('admin'), routeStationController.updateRouteStation);

// Delete route-station (admin only)
router.delete('/:id', ...authorizeRoles('admin'), routeStationController.deleteRouteStation);

module.exports = router;
