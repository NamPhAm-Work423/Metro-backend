const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const verifyToken = require('../middlewares/verifyToken');
const { checkRole } = require('../middlewares/role');

// Protected routes - require authentication
router.use(verifyToken);

// User routes
router.post('/', ticketController.createTicket);
router.get('/:id', ticketController.getTicketById);
router.put('/:id', ticketController.updateTicket);

// Admin routes
router.use(checkRole('admin'));
router.get('/', ticketController.getAllTickets);
router.delete('/:id', ticketController.deleteTicket);

module.exports = router; 