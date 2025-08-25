const express = require('express');
const TicketController = require('../controllers/ticket.controller');
const TransitPassController = require('../controllers/transitPass.controller');
const PassengerDiscountController = require('../controllers/passengerDiscount.controller');

const router = express.Router();
const ticketController = new TicketController();
const transitPassController = new TransitPassController();
const passengerDiscountController = new PassengerDiscountController();

// Bind controller methods to preserve 'this' context
const getAllFares = ticketController.getAllFares.bind(ticketController);
const getFaresByRoute = ticketController.getFaresByRoute.bind(ticketController);
const searchFares = ticketController.searchFares.bind(ticketController);
const calculateFareExample = ticketController.calculateFareExample.bind(ticketController);
const getAllTransitPasses = transitPassController.getAllTransitPasses.bind(transitPassController);
const getTransitPassByType = transitPassController.getTransitPassByType.bind(transitPassController);
const getAllPassengerDiscounts = passengerDiscountController.getAllPassengerDiscounts.bind(passengerDiscountController);
const getPassengerDiscountByType = passengerDiscountController.getPassengerDiscountByType.bind(passengerDiscountController);

// Fares endpoints
router.get('/fares', getAllFares);
router.get('/fares/search', searchFares);
router.get('/fares/route/:routeId', getFaresByRoute);
router.get('/fares/route/:routeId/calculate', calculateFareExample);

// Transit passes endpoints
router.get('/transit-passes', getAllTransitPasses);
router.get('/transit-passes/:type', getTransitPassByType);

// Passenger discounts endpoints
router.get('/passenger-discounts', getAllPassengerDiscounts);
router.get('/passenger-discounts/:type', getPassengerDiscountByType);

module.exports = router; 