const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.route');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * Mount routes with their respective prefixes
 */

// Authentication routes - mounted at /
router.use('/auth', process.env.NEED_API_KEY === 'true' ? authMiddleware.validateAPIKeyMiddleware : authRoutes);


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