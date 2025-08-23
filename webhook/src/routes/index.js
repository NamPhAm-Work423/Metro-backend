const express = require('express');
const paypalRoutes = require('./paypal.routes');
const { logger } = require('../config/logger');

const router = express.Router();

/**
 * Main Routes Index
 * Organizes all webhook provider routes
 */

// PayPal webhook routes
router.use('/webhook', paypalRoutes);

// Generic webhook health check
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        service: 'webhook-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        providers: {
            paypal: 'active'
            // Future providers: stripe, square, vnpay, etc.
        },
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Generic statistics endpoint (combines all providers)
router.get('/statistics', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        // TODO: Implement combined statistics from all providers
        const statistics = {
            period: {
                startDate: start.toISOString(),
                endDate: end.toISOString()
            },
            providers: {
                paypal: 'Use /paypal/statistics for detailed PayPal stats'
                // Future providers stats will be added here
            },
            total: {
                webhooksReceived: 0,
                webhooksProcessed: 0,
                webhooksFailed: 0,
                duplicates: 0
            }
        };

        logger.info('Generic webhook statistics requested', {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            ip: req.ip
        });

        res.status(200).json({
            success: true,
            data: statistics
        });

    } catch (error) {
        logger.error('Failed to get webhook statistics', {
            error: error.message,
            stack: error.stack,
            ip: req.ip
        });

        res.status(500).json({
            success: false,
            error: 'STATISTICS_ERROR',
            message: 'Failed to retrieve webhook statistics'
        });
    }
});



module.exports = router;
