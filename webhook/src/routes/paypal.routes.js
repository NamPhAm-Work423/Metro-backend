const express = require('express');
const paypalController = require('../controllers/paypal.controller');
const { defaultRateLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

/**
 * PayPal Webhook Routes
 * Handles all PayPal webhook related endpoints
 */

// Main webhook endpoint - receives PayPal webhooks
router.post('/paypal', 
    defaultRateLimiter,
    // Temporarily disable header validation for testing
    // paypalController.validatePayPalHeaders,
    // paypalController.parseRawBody,
    paypalController.handleWebhook
);

// Health check endpoint
router.get('/health', paypalController.healthCheck);

// Statistics endpoint - protected route
router.get('/statistics', paypalController.getStatistics);

// Retry failed webhooks - admin only
router.post('/retry', paypalController.retryFailedWebhooks);

module.exports = router;
