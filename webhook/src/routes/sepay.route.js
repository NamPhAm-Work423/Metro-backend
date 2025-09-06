const express = require('express');
const sepayController = require('../controllers/sepay.controller');
const { defaultRateLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

/**
 * Sepay Webhook Routes
 * Handles all Sepay webhook related endpoints
 */

// Main webhook endpoint - receives Sepay webhooks
router.post('/sepay', 
    defaultRateLimiter,
    // Temporarily disable header validation for testing
    // sepayController.validateSepayHeaders,
    // sepayController.parseRawBody,
    sepayController.handleWebhook
);

// Development endpoint (if needed)
if(process.env.NODE_ENV === 'development'){
    router.post('/sepay/dev', 
        defaultRateLimiter,
        sepayController.handleWebhook
    );
}

// Health check endpoint
router.get('/health', sepayController.healthCheck);

// Statistics endpoint - protected route
router.get('/statistics', sepayController.getStatistics);

// Retry failed webhooks - admin only
router.post('/retry', sepayController.retryFailedWebhooks);

module.exports = router;



