const express = require('express');
const router = express.Router();
const routeStationController = require('../controllers/routeStation.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Get all route-stations (staff and admin)
router.get('/getAllRouteStations', ...authorizeRoles('staff', 'admin'), routeStationController.getAllRouteStations);

// Search routes between stations (all roles)
router.get('/findRoutesBetweenTwoStations', ...authorizeRoles('passenger', 'staff', 'admin'), routeStationController.findRoutesBetweenTwoStations);

// Shortest path between two stations with transfers (all roles)
router.get('/findShortestPath', ...authorizeRoles('passenger', 'staff', 'admin'), routeStationController.findShortestPath);

// Get route-station by ID (staff and admin)
router.get('/getRouteStationById/:id', ...authorizeRoles('staff', 'admin'), routeStationController.getRouteStationById);

// Create route-station (admin only)
router.post('/createRouteStation', ...authorizeRoles('admin'), routeStationController.createRouteStation);

// Update route-station (admin only)
router.put('/updateRouteStation/:id', ...authorizeRoles('admin'), routeStationController.updateRouteStation);

// Delete route-station (admin only)
router.delete('/deleteRouteStation/:id', ...authorizeRoles('admin'), routeStationController.deleteRouteStation);

module.exports = router;
