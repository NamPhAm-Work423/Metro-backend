const express = require('express');
const { config } = require('../config');
const HealthController = require('../controllers/health.controller');

// Import route modules
const transportRoutes = require('./transport.route');
const ticketRoutes = require('./ticket.route');
const cacheRoutes = require('./cache.route');

const router = express.Router();
const healthController = new HealthController();

// Bind health controller methods
const getHealth = healthController.getHealth.bind(healthController);
const getDetailedHealth = healthController.getDetailedHealth.bind(healthController);
const getSystemInfo = healthController.getSystemInfo.bind(healthController);
const getReadiness = healthController.getReadiness.bind(healthController);
const getLiveness = healthController.getLiveness.bind(healthController);

// Health endpoints (no versioning)
router.get('/health', getHealth);
router.get('/health/detailed', getDetailedHealth);
router.get('/health/info', getSystemInfo);
router.get('/health/ready', getReadiness);
router.get('/health/live', getLiveness);

// API versioning - all API routes are prefixed with /v1
const apiRouter = express.Router();

// Mount route modules under API version
apiRouter.use('/', transportRoutes);
apiRouter.use('/', ticketRoutes);
apiRouter.use('/cache', cacheRoutes);

// API endpoints documentation
apiRouter.get('/', (req, res) => {
    res.json({
        service: config.app.name,
        version: '1.0.0',
        description: 'Public service that caches transport and ticket data',
        endpoints: {
            health: {
                basic: 'GET /health',
                detailed: 'GET /health/detailed',
                info: 'GET /health/info',
                ready: 'GET /health/ready',
                live: 'GET /health/live'
            },
            transport: {
                routes: {
                    all: 'GET /v1/routes',
                    search: 'GET /v1/routes/search?origin=<stationId>&destination=<stationId>',
                    byId: 'GET /v1/routes/:id',
                    stations: 'GET /v1/routes/:routeId/stations'
                },
                stations: {
                    all: 'GET /v1/stations',
                    byId: 'GET /v1/stations/:id'
                }
            },
            ticket: {
                fares: {
                    all: 'GET /v1/fares',
                    search: 'GET /v1/fares/search?routeId=<id>&currency=<VND>&isActive=<true>',
                    byRoute: 'GET /v1/fares/route/:routeId',
                    calculate: 'GET /v1/fares/route/:routeId/calculate?stations=<count>&tripType=<oneway|return>'
                },
                transitPasses: {
                    all: 'GET /v1/transit-passes',
                    byType: 'GET /v1/transit-passes/:type'
                }
            },
            cache: {
                status: 'GET /v1/cache/status',
                stats: 'GET /v1/cache/stats',
                metadata: 'GET /v1/cache/metadata',
                health: 'GET /v1/cache/health',
                refresh: 'POST /v1/cache/refresh',
                clear: 'DELETE /v1/cache/clear',
                resetStats: 'POST /v1/cache/reset-stats',
                scheduler: {
                    status: 'GET /v1/cache/scheduler',
                    control: 'POST /v1/cache/scheduler/control'
                }
            }
        },
        features: [
            'Automated data caching every 24 hours',
            'Redis-based high-performance storage',
            'Transport data (routes, stations)',
            'Ticket data (fares, transit passes)',
            'Real-time cache management',
            'Health monitoring and status',
            'Scheduler control and monitoring'
        ],
        cached: true,
        timestamp: new Date().toISOString()
    });
});

// Mount API router under version prefix
router.use(config.app.apiPrefix, apiRouter);

// 404 handler for unknown routes
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: {
            health: '/health',
            api: config.app.apiPrefix + '/',
            documentation: config.app.apiPrefix + '/'
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router; 