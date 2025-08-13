const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { requestLogger, logger } = require('./config/logger');
const routes = require('./routes');
const { register, errorCount } = require('./config/metrics');
const cookieParser = require('cookie-parser');
const metricsMiddleware = require('./middlewares/metrics.middleware');

const app = express();

app.use(metricsMiddleware);
app.use(cookieParser());
// Security middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//SECURITY: Network source validation middleware
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
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }

        // Load extra allowed origins from env
        const envAllowed = (process.env.ALLOWED_ORIGINS || '')
            .split(',')
            .map(o => o.trim())
            .filter(Boolean);

        const allowedOrigins = [
            // 'http://localhost:8000',    // API Gateway (dev)
            // 'http://api-gateway:8000',  // Docker service
            process.env.API_GATEWAY_ORIGIN, // e.g., https://api.metrohcm.io.vn
            ...envAllowed,
            undefined                   // For same-origin requests
        ];

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Log blocked origins for debugging
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
app.use(cors(corsOptions));
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

// Health check endpoint (bypass network validation)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'transport-service',
        timestamp: new Date().toISOString()
    });
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