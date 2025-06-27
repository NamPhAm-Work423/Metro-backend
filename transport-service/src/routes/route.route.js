const express = require('express');
const router = express.Router();
const routeController = require('../controllers/route.controller');
const routeStationController = require('../controllers/routeStation.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Get all routes (all roles)
router.get('/', ...authorizeRoles('passenger', 'staff', 'admin'), routeController.getAllRoutes);

// Get active routes (all roles)
router.get('/active', ...authorizeRoles('passenger', 'staff', 'admin'), routeController.getActiveRoutes);

// Search routes between stations (all roles)
router.get('/search/between-stations', ...authorizeRoles('passenger', 'staff', 'admin'), routeController.findRoutesBetweenStations);

// Get routes by station (all roles)
router.get('/station/:stationId', ...authorizeRoles('passenger', 'staff', 'admin'), routeController.getRoutesByStation);

// Get route by ID (all roles)
router.get('/:id', ...authorizeRoles('passenger', 'staff', 'admin'), routeController.getRouteById);

// Calculate route distance (all roles)
router.get('/:id/distance', ...authorizeRoles('passenger', 'staff', 'admin'), routeController.calculateRouteDistance);

// Get stations by route (all roles)
router.get('/:routeId/stations', ...authorizeRoles('passenger', 'staff', 'admin'), routeStationController.getStationsByRoute);

// Get route path with details (all roles)
router.get('/:routeId/path', ...authorizeRoles('passenger', 'staff', 'admin'), routeStationController.getRoutePathWithDetails);

// Setup complete route (admin only)
router.post('/:routeId/setup', ...authorizeRoles('admin'), routeStationController.setupCompleteRoute);

// Validate route sequence (staff and admin)
router.get('/:routeId/validate', ...authorizeRoles('staff', 'admin'), routeStationController.validateRouteSequence);

// Reorder route stations (admin only)
router.put('/:routeId/reorder', ...authorizeRoles('admin'), routeStationController.reorderRouteStations);

// Create route (admin only)
router.post('/', ...authorizeRoles('admin'), routeController.createRoute);

// Update route (admin only)
router.put('/:id', ...authorizeRoles('admin'), routeController.updateRoute);

// Delete route (admin only)
router.delete('/:id', ...authorizeRoles('admin'), routeController.deleteRoute);

module.exports = router;