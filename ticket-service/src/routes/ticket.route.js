const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const { authorizeRoles } = require('../middlewares/authorization');


// Public ticket validation (for transit systems)
router.get('/:id/validate', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.validateTicket);

// Passenger self-service routes
//Passenger can use this route to get all their tickets
router.get('/me', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getMyTickets);
//Passenger can use this route to get all their active tickets
router.get('/me/unused', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getMyActiveTickets);
//Passenger can use this route to get all their used tickets
router.get('/me/used', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getMyInactiveTickets);
//Passenger can use this route to get all their cancelled tickets
router.get('/me/cancelled', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getMyCancelledTickets);
//Passenger can use this route to get all their expired tickets
router.get('/me/expired', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getMyExpiredTickets);
//Passenger can use this route to get QR code of a ticket
router.get('/:id/qrcode', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getQRCode);
//Passenger can use this route to cancel a ticket NOT refund
router.post('/:id/cancel', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.cancelTicket);
//Passenger can use this route to get a code to validate a ticket to their phone
router.post('/:id/phoneCode', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getCode);
//Passenger can use this route to get a mail contain a ticket
router.post('/:id/mailCode', ...authorizeRoles('passenger', 'staff', 'admin'), ticketController.getMailCode);


//Staff and admin can use this route to validate a ticket
router.get('/:id/validate', ...authorizeRoles('staff', 'admin'), ticketController.validateTicket);
//Staff and admin can use this route to get details of a ticket
router.get('/:id/detail', ...authorizeRoles('staff', 'admin'), ticketController.getTicketDetail);
//Staff and admin can use this route to update a ticket
router.put('/:id/update', ...authorizeRoles('staff', 'admin'), ticketController.updateTicket);
//Staff and admin can use this route to delete a ticket
router.delete('/:id/delete', ...authorizeRoles('staff', 'admin'), ticketController.deleteTicket);


//Admin can use this route to get all tickets
router.get('/getAllTickets', ...authorizeRoles('admin'), ticketController.getAllTickets);



//

module.exports = router;
