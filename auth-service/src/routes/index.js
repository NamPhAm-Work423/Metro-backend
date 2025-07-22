const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.route');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * Mount routes with their respective prefixes
 */

// Authentication routes - mounted at /v1/auth
if (process.env.NEED_API_KEY === 'true') {
    router.use('/v1/auth', authMiddleware.validateAPIKeyMiddleware, authRoutes);
} else {
    router.use('/v1/auth', authRoutes);
}


// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Auth Service is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});



module.exports = router; 