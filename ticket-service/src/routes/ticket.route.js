const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Price calculation routes (for frontend display)
router.post('/calculate-price', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.calculateTicketPrice);

// Passenger ticket creation
router.post('/create-short-term', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.createShortTermTicket);
router.post('/create-long-term', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.createLongTermTicket);
router.post('/activate-long-term/:id', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.activateLongTermTicket);

// Passenger self-service routes
router.get('/me', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getMyTickets);
router.get('/me/unused', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getMyActiveTickets);
router.get('/me/used', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getMyInactiveTickets);
router.get('/me/cancelled', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getMyCancelledTickets);
router.get('/me/expired', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getMyExpiredTickets);

// Passenger ticket actions
router.get('/:id/getTicket', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getTicket);
router.post('/:id/cancel', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.cancelTicket);
router.post('/:id/phoneTicket', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getPhoneTicket);
router.post('/:id/mailTicket', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getMailTicket);

//Ticket Using Route:
router.post('/:id/use', ...authorizeRoles('staff', 'admin'), ticketController.useTicket);
router.post('/qr/:qrCode/use', ...authorizeRoles('staff', 'admin'), ticketController.useTicketByQRCode);
// Public/Transit system validation (accessible by all authenticated users)
router.get('/:id/validate', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.validateTicket);

// Payment routes
router.get('/payment-status/:paymentId', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getPaymentStatus);
router.get('/:id/payment', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getTicketPayment);

// Staff and admin management routes
router.get('/:id/detail', ...authorizeRoles('staff', 'admin'), ticketController.getTicketDetail);
router.put('/:id/update', ...authorizeRoles('staff', 'admin'), ticketController.updateTicket);
router.delete('/:id/delete', ...authorizeRoles('staff', 'admin'), ticketController.deleteTicket);

// Admin-only routes
router.get('/getAllTickets', ...authorizeRoles('staff', 'admin'), ticketController.getAllTickets);
router.get('/getTicketStatistics', ...authorizeRoles('staff', 'admin'), ticketController.getTicketStatistics);

module.exports = router;
