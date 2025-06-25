const express = require('express');
const router = express.Router();

// Import route modules
const staffRoutes = require('./staff.route');

// Health check route
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Staff service is healthy',
        timestamp: new Date().toISOString()
    });
});

// Staff routes
router.use('/staff', staffRoutes);

module.exports = router; 