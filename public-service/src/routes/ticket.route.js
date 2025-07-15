const express = require('express');
const TicketController = require('../controllers/ticket.controller');

const router = express.Router();
const ticketController = new TicketController();

// Bind controller methods to preserve 'this' context
const getAllFares = ticketController.getAllFares.bind(ticketController);
const getFaresByRoute = ticketController.getFaresByRoute.bind(ticketController);
const searchFares = ticketController.searchFares.bind(ticketController);
const calculateFareExample = ticketController.calculateFareExample.bind(ticketController);
const getAllTransitPasses = ticketController.getAllTransitPasses.bind(ticketController);
const getTransitPassByType = ticketController.getTransitPassByType.bind(ticketController);

// Fares endpoints
router.get('/fares', getAllFares);
router.get('/fares/search', searchFares);
router.get('/fares/route/:routeId', getFaresByRoute);
router.get('/fares/route/:routeId/calculate', calculateFareExample);

// Transit passes endpoints
router.get('/transit-passes', getAllTransitPasses);
router.get('/transit-passes/:type', getTransitPassByType);

module.exports = router; 