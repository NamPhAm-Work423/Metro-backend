const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { requestLogger, logger } = require('./config/logger');
const routes = require('./routes');
const { register, errorCount } = require('./config/metrics');
const metricsMiddleware = require('./middlewares/metrics.middleware');

const app = express();

app.use(metricsMiddleware);

// Security middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔐 SECURITY: Network source validation middleware
const validateNetworkSource = (req, res, next) => {
    const allowedHosts = [
        'api-gateway',        // Docker service name
        'localhost',          // Local development
        '127.0.0.1',         // Local development
        '172.', '10.', '192.168.'  // Private network ranges for Docker
    ];
    
    const sourceIP = req.ip || req.connection.remoteAddress;
    const forwardedFor = req.headers['x-forwarded-for'];
    const host = req.headers.host;
    const origin = req.headers.origin;
    
    // Check if request is from API Gateway or allowed network
    const isFromAllowedSource = allowedHosts.some(allowedHost => {
        return sourceIP?.includes(allowedHost) || 
               forwardedFor?.includes(allowedHost) ||
               host?.includes(allowedHost);
    });
    
    // Check for service-to-service authentication header
    const hasServiceAuth = req.headers['x-service-auth'];
    
    // Log request details for debugging
    logger.debug('Network validation check', {
        sourceIP,
        forwardedFor,
        host,
        origin,
        isFromAllowedSource,
        hasServiceAuth,
        userAgent: req.headers['user-agent']
    });
    
    if (!isFromAllowedSource && !hasServiceAuth) {
        logger.warn('🚫 Direct external access blocked', {
            sourceIP,
            forwardedFor,
            host,
            origin,
            userAgent: req.headers['user-agent'],
            url: req.url
        });
        
        return res.status(403).json({
            success: false,
            message: 'Direct access to transport service is not allowed. Please use API Gateway.',
            error: 'DIRECT_ACCESS_FORBIDDEN'
        });
    }
    
    next();
};

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const envAllowed = (process.env.ALLOWED_ORIGINS || '')
            .split(',')
            .map(o => o.trim())
            .filter(Boolean);

        const allowedOrigins = [
            process.env.API_GATEWAY_ORIGIN,
            ...envAllowed,
            undefined
        ];

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn('CORS blocked origin', { origin });
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Service-Auth', 'X-API-Key'],
    exposedHeaders: ['Content-Type', 'Authorization']
};

// Apply network validation before CORS
app.use(validateNetworkSource);

// Only use CORS in development - in production, Nginx handles CORS
if (process.env.NODE_ENV !== 'production') {
    app.use(cors(corsOptions));
} else {
    // In production, skip CORS middleware to avoid conflicts with Nginx
    logger.info('Production mode: CORS handled by Nginx, skipping Express CORS middleware');
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
    logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        origin: req.headers.origin,
        host: req.headers.host,
        forwardedFor: req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
        hasServiceAuth: !!req.headers['x-service-auth'],
        serviceAuthHeader: req.headers['x-service-auth'] ? 'present' : 'missing'
    });
    next();
});

// Routes
app.use('/v1', routes);

// Health check endpoint with dependency validation
app.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'OK',
            service: 'transport-service',
            timestamp: new Date().toISOString(),
            checks: {
                database: 'OK',
                uptime: process.uptime()
            }
        };

        // Test database connection
        try {
            const sequelize = require('./config/database');
            await sequelize.authenticate();
            health.checks.database = 'OK';
        } catch (dbError) {
            health.status = 'UNHEALTHY';
            health.checks.database = 'FAILED';
            health.error = dbError.message;
            return res.status(503).json(health);
        }

        res.status(200).json(health);
    } catch (error) {
        res.status(503).json({
            status: 'UNHEALTHY',
            service: 'transport-service',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Metrics endpoint for API Gateway
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Global error handler
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
    });

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        error: 'ROUTE_NOT_FOUND'
    });
});

module.exports = app; 