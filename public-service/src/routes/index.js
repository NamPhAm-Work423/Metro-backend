const express = require('express');
const router = express.Router();

// Import route modules
const cacheRoutes = require('./cache.route');
const ticketRoutes = require('./ticket.route');
const transportRoutes = require('./transport.route');
const healthController = require('../controllers/health.controller');

// Health check routes
router.get('/health', (req, res) => healthController.getHealth(req, res));
router.get('/health/detailed', (req, res) => healthController.getDetailedHealth(req, res));
router.get('/health/ready', (req, res) => healthController.getReadiness(req, res));
router.get('/health/live', (req, res) => healthController.getLiveness(req, res));

// Metrics endpoint for API Gateway health check
router.get('/metrics', (req, res) => {
  res.status(200).json({
    service: 'public-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    version: '1.0.0'
  });
});

// Cache routes
router.use('/cache', cacheRoutes);

// Ticket routes
router.use('/ticket', ticketRoutes);

// Transport routes  
router.use('/transport', transportRoutes);

module.exports = router; 