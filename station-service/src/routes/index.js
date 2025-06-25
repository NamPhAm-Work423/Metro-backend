const express = require('express');
const router = express.Router();
const stationRoutes = require('./station.route');

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Station service is healthy',
        timestamp: new Date().toISOString(),
        service: 'station-service',
        version: process.env.SERVICE_VERSION || '1.0.0'
    });
});

// Station routes
router.use('/stations', stationRoutes);

module.exports = router; 