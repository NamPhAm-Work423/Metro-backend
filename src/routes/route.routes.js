const express = require('express');
const router = express.Router();
const routeController = require('../controllers/route.controller');
const verifyToken = require('../middlewares/verifyToken');
const { checkRole } = require('../middlewares/role');

// Public routes
router.get('/', routeController.getAllRoutes);
router.get('/:id', routeController.getRouteById);
router.get('/:id/stations', routeController.getRouteStations);
router.get('/:id/schedule', routeController.getRouteSchedule);
router.get('/:id/distance', routeController.calculateRouteDistance);
router.get('/:id/fare', routeController.getRouteFare);

// Protected routes - require authentication
router.use(verifyToken);

// Admin routes
router.post('/', checkRole('admin'), routeController.createRoute);
router.put('/:id', checkRole('admin'), routeController.updateRoute);
router.delete('/:id', checkRole('admin'), routeController.deleteRoute);
router.get('/:id/statistics', checkRole('admin'), routeController.getRouteStatistics);

module.exports = router; 