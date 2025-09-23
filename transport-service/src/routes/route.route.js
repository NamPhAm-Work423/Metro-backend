const express = require('express');
const router = express.Router();
const routeController = require('../controllers/route.controller');
const routeStationController = require('../controllers/routeStation.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Get all routes (all roles)
router.get('/getRoutes', ...authorizeRoles('passenger', 'staff', 'admin'), routeController.getAllRoutes);

// Get active routes (all roles)
router.get('/getActiveRoutes', ...authorizeRoles('passenger', 'staff', 'admin'), routeController.getActiveRoutes);

// Search routes between stations (all roles)
router.get('/findRoutesBetweenStations', ...authorizeRoles('passenger', 'staff', 'admin'), routeController.findRoutesBetweenStations);

// Get routes by station (all roles)
router.get('/getRoutesByStation/:stationId', ...authorizeRoles('passenger', 'staff', 'admin'), routeController.getRoutesByStation);

// Get route by ID (all roles)
router.get('/getRouteById/:id', ...authorizeRoles('passenger', 'staff', 'admin'), routeController.getRouteById);

// Calculate route distance (all roles)
router.get('/getRouteDistance/:id', ...authorizeRoles('passenger', 'staff', 'admin'), routeController.calculateRouteDistance);

// Get stations by route (all roles)
router.get('/getStationsByRoute/:routeId', ...authorizeRoles('passenger', 'staff', 'admin'), routeStationController.getStationsByRoute);

// Get route path with details (all roles)
router.get('/getRoutePathWithDetails/:routeId', ...authorizeRoles('passenger', 'staff', 'admin'), routeStationController.getRoutePathWithDetails);

// Setup complete route (admin only)
router.post('/setupCompleteRoute/:routeId', ...authorizeRoles('admin'), routeStationController.setupCompleteRoute);

// Validate route sequence (staff and admin)
router.get('/validateRouteSequence/:routeId', ...authorizeRoles('staff', 'admin'), routeStationController.validateRouteSequence);

// Reorder route stations (admin only)
router.put('/reorderRouteStations/:routeId', ...authorizeRoles('admin'), routeStationController.reorderRouteStations);

// Create route (admin only)
router.post('/createRoute', ...authorizeRoles('admin'), routeController.createRoute);

// Update route (admin only)
router.put('/updateRoute/:id', ...authorizeRoles('admin'), routeController.updateRoute);

// Delete route (admin only)
router.delete('/deleteRoute/:id', ...authorizeRoles('admin'), routeController.deleteRoute);

module.exports = router;