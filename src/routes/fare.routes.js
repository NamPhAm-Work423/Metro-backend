const express = require('express');
const router = express.Router();
const fareController = require('../controllers/fare.controller');
const verifyToken = require('../middlewares/verifyToken');
const { checkRole } = require('../middlewares/role');

// Public routes
router.post('/calculate', fareController.calculateFare);
router.get('/route/:routeId', fareController.getFareByRoute);
router.get('/passenger-type/:passengerType', fareController.getFareByPassengerType);
router.get('/ticket-type/:ticketType', fareController.getFareByTicketType);

// Protected routes - require authentication and staff/admin role
router.use(verifyToken);
router.use(checkRole('staff', 'admin'));

// Staff routes
router.get('/', fareController.getAllFares);
router.get('/:id', fareController.getFareById);
router.post('/:id/discount', fareController.applyFareDiscount);

// Admin routes
router.use(checkRole('admin'));
router.post('/', fareController.createFare);
router.put('/:id', fareController.updateFare);
router.delete('/:id', fareController.deleteFare);

module.exports = router; 