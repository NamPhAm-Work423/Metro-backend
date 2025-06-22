const express = require('express');
const router = express.Router();
const passengerController = require('../controllers/passenger.controller');
const verifyToken = require('../middlewares/verifyToken');
const { checkRole } = require('../middlewares/role');

// Protected routes - require authentication
router.use(verifyToken);

// Passenger routes
router.post('/', passengerController.createPassenger);
router.get('/:id', passengerController.getPassengerById);
router.put('/:id', passengerController.updatePassenger);
router.get('/:id/tickets', passengerController.getPassengerTickets);
router.get('/:id/history', passengerController.getPassengerHistory);

// Admin routes
router.use(checkRole('admin'));
router.get('/', passengerController.getAllPassengers);
router.delete('/:id', passengerController.deletePassenger);

module.exports = router; 