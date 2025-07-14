const express = require('express');
const TransportController = require('../controllers/transport.controller');

const router = express.Router();
const transportController = new TransportController();

// Bind controller methods to preserve 'this' context
const getAllRoutes = transportController.getAllRoutes.bind(transportController);
const getRouteById = transportController.getRouteById.bind(transportController);
const getAllStations = transportController.getAllStations.bind(transportController);
const getStationById = transportController.getStationById.bind(transportController);
const getRouteStations = transportController.getRouteStations.bind(transportController);
const searchRoutes = transportController.searchRoutes.bind(transportController);

// Routes endpoints
router.get('/routes', getAllRoutes);
router.get('/routes/search', searchRoutes);
router.get('/routes/:id', getRouteById);
router.get('/routes/:routeId/stations', getRouteStations);

// Stations endpoints  
router.get('/stations', getAllStations);
router.get('/stations/:id', getStationById);

module.exports = router; 