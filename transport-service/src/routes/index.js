const express = require('express');
const router = express.Router();

// Entity-specific routes
const stationRoutes = require('./station.route');
const routeRoutes = require('./route.route');
const trainRoutes = require('./train.route');
const tripRoutes = require('./trip.route');
const stopRoutes = require('./stop.route');
const routeStationRoutes = require('./routeStation.route');

// Create sub-router so that all endpoints are prefixed with /transport
const transportRouter = express.Router();

transportRouter.use('/station', stationRoutes);
transportRouter.use('/route', routeRoutes);
transportRouter.use('/train', trainRoutes);
transportRouter.use('/trip', tripRoutes);
transportRouter.use('/stop', stopRoutes);
transportRouter.use('/route-station', routeStationRoutes);

// Mount transport router under /transport prefix
router.use('/transport', transportRouter);

module.exports = router; 