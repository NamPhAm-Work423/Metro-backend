const express = require('express');
const router = express.Router();

// Entity-specific routes
const ticketRoutes = require('./ticket.route');
const fareRoutes = require('./fare.route');
const promotionRoutes = require('./promotion.route');
const transitPassRoutes = require('./transitPass.route');
const passengerDiscountRoutes = require('./passengerDiscount.route');

// Create sub-router so that all endpoints are prefixed with /ticket
const ticketServiceRouter = express.Router();

// Mount specific route modules
ticketServiceRouter.use('/tickets', ticketRoutes);
ticketServiceRouter.use('/fares', fareRoutes);
 ticketServiceRouter.use('/promotions', promotionRoutes);
 ticketServiceRouter.use('/transitPasses', transitPassRoutes);
ticketServiceRouter.use('/passengerDiscounts', passengerDiscountRoutes);

// Health check for the entire service
ticketServiceRouter.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Ticket service is healthy',
        timestamp: new Date(),
        service: 'ticket-service',
        version: '1.0.0',
        endpoints: {
            tickets: '/ticket/tickets',
            fares: '/ticket/fares',
            promotions: '/ticket/promotions',
            passengerDiscounts: '/ticket/passengerDiscounts',
            transitPasses: '/ticket/transitPasses'
        }
    });
});

// Mount ticket service router under /ticket prefix
router.use('/ticket', ticketServiceRouter);


module.exports = router;
