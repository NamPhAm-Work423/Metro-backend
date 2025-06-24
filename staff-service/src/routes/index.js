const express = require('express');
const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
    res.json({ 
        success: true,
        message: 'Staff service is running',
        service: 'staff-service',
        timestamp: new Date().toISOString()
    });
});

// TODO: Add staff routes here
// const staffRoutes = require('./staff.route');
// router.use('/staff', staffRoutes);

module.exports = router; 