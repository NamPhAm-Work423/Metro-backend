const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Health check endpoint (no auth required)
router.get('/health', ticketController.healthCheck);

// Public ticket validation (for transit systems)
router.get('/:id/validate', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.validateTicket);

// Passenger self-service routes
router.get('/me', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getMyTickets);
router.get('/me/active', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getMyActiveTickets);

// Ticket lifecycle operations
router.post('/:id/use', ...authorizeRoles('staff', 'admin'), ticketController.useTicket);
router.post('/:id/cancel', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.cancelTicket);
router.post('/:id/refund', ...authorizeRoles('staff', 'admin'), ticketController.refundTicket);

// Passenger-specific queries (staff/admin only)
router.get('/passenger/:passengerId', ...authorizeRoles('staff', 'admin'), ticketController.getTicketsByPassenger);
router.get('/passenger/:passengerId/active', ...authorizeRoles('staff', 'admin'), ticketController.getActiveTicketsByPassenger);

// Administrative operations
router.get('/statistics', ...authorizeRoles('staff', 'admin'), ticketController.getTicketStatistics);
router.post('/expire', ...authorizeRoles('admin'), ticketController.expireTickets);

// CRUD operations
router.get('/', ...authorizeRoles('staff', 'admin'), ticketController.getAllTickets);
router.post('/', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.createTicket);
router.get('/:id', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getTicketById);

module.exports = router;
