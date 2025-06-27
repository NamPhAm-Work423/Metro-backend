const express = require('express');
const router = express.Router();

// Entity-specific routes
const ticketRoutes = require('./ticket.route');
const fareRoutes = require('./fare.route');
const promotionRoutes = require('./promotion.route');

// Create sub-router so that all endpoints are prefixed with /ticket
const ticketServiceRouter = express.Router();

// Mount specific route modules
ticketServiceRouter.use('/tickets', ticketRoutes);
ticketServiceRouter.use('/fares', fareRoutes);
ticketServiceRouter.use('/promotions', promotionRoutes);

// Health check for the entire service
ticketServiceRouter.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Ticket service is healthy',
        timestamp: new Date(),
        service: 'ticket-service',
        version: '1.0.0',
        endpoints: {
            tickets: '/api/v1/ticket/tickets',
            fares: '/api/v1/ticket/fares',
            promotions: '/api/v1/ticket/promotions'
        }
    });
});

// Mount ticket service router under /ticket prefix
router.use('/ticket', ticketServiceRouter);

// Legacy route for backward compatibility (if needed)
router.use('/ticketing', ticketServiceRouter);

module.exports = router;
