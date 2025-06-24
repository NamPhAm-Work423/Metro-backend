const express = require('express');
const router = express.Router();

// Health check route
router.get('/health', (req, res) => {
    res.json({ 
        success: true,
        message: 'Admin service is running',
        service: 'admin-service',
        timestamp: new Date().toISOString()
    });
});

// TODO: Add admin routes here
// const adminRoutes = require('./admin.route');
// router.use('/admin', adminRoutes);

module.exports = router; 