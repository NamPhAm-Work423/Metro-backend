require('dotenv').config();

const config = {
    // Application configuration
    app: {
        name: process.env.SERVICE_NAME || 'public-service',
        port: parseInt(process.env.PORT) || 3004,
        env: process.env.NODE_ENV || 'development',
        apiPrefix: process.env.API_PREFIX || '/v1'
    },

    // Redis configuration
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        user: process.env.REDIS_USER,
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'public_service_',
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        ttl: parseInt(process.env.REDIS_TTL_SECONDS) || 86400 // 24 hours
    },

    // Cache configuration
    cache: {
        ttlHours: parseInt(process.env.CACHE_TTL_HOURS) || 24,
        ttlSeconds: (parseInt(process.env.CACHE_TTL_HOURS) || 24) * 3600,
        metadataTtlSeconds: 3600, // 1 hour for metadata
        healthTtlSeconds: 300 // 5 minutes for health checks
    },

    // Scheduler configuration
    scheduler: {
        enabled: process.env.SCHEDULER_ENABLED !== 'false',
        cron: process.env.SCHEDULER_CRON || '0 0 * * *', // Daily at midnight
        initialDelayMs: parseInt(process.env.SCHEDULER_INITIAL_DELAY_MS) || 30000 // 30 seconds
    },

    // External services configuration
    services: {
        transport: {
            url: process.env.TRANSPORT_SERVICE_URL || 'http://transport-service:3005',
            grpcUrl: process.env.TRANSPORT_SERVICE_GRPC_URL || 'localhost:50051',
            timeout: parseInt(process.env.TRANSPORT_SERVICE_TIMEOUT) || 5000,
            retries: parseInt(process.env.TRANSPORT_SERVICE_RETRIES) || 3,
            retryDelayMs: parseInt(process.env.TRANSPORT_SERVICE_RETRY_DELAY_MS) || 1000
        },
        ticket: {
            url: process.env.TICKET_SERVICE_URL || 'http://ticket-service:3003',
            grpcUrl: process.env.TICKET_SERVICE_GRPC_URL || 'localhost:50052',
            timeout: parseInt(process.env.TICKET_SERVICE_TIMEOUT) || 5000,
            retries: parseInt(process.env.TICKET_SERVICE_RETRIES) || 3,
            retryDelayMs: parseInt(process.env.TICKET_SERVICE_RETRY_DELAY_MS) || 1000
        }
    },

    // Authentication configuration
    auth: {
        serviceJwtSecret: process.env.SERVICE_JWT_SECRET
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        maxSize: process.env.LOG_MAX_SIZE || '20m',
        maxFiles: process.env.LOG_MAX_FILES || '14d'
    },

    // Health check configuration
    health: {
        checkIntervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000
    },

    // CORS configuration
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
        optionsSuccessStatus: 200
    },

    // Security configuration
    security: {
        helmet: {
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false
        }
    },

    // Rate limiting configuration
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // Limit each IP to 1000 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false
    }
};

// Validation functions
function validateConfig() {
    const errors = [];

    // Validate required configurations
    if (!config.redis.host) {
        errors.push('REDIS_HOST is required');
    }

    if (!config.services.transport.url) {
        errors.push('TRANSPORT_SERVICE_URL is required');
    }

    if (!config.services.ticket.url) {
        errors.push('TICKET_SERVICE_URL is required');
    }

    // Validate numeric values
    if (isNaN(config.app.port) || config.app.port < 1 || config.app.port > 65535) {
        errors.push('PORT must be a valid port number');
    }

    if (isNaN(config.cache.ttlHours) || config.cache.ttlHours < 1) {
        errors.push('CACHE_TTL_HOURS must be a positive number');
    }

    if (isNaN(config.scheduler.fetchIntervalHours) || config.scheduler.fetchIntervalHours < 1) {
        errors.push('FETCH_INTERVAL_HOURS must be a positive number');
    }

    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
}

// Cache key templates
const cacheKeys = {
    // Transport data
    routes: {
        all: 'routes:all',
        byId: (id) => `routes:${id}`,
        stations: (routeId) => `route_stations:${routeId}`
    },
    stations: {
        all: 'stations:all',
        byId: (id) => `stations:${id}`
    },
    
    // Ticket data
    fares: {
        all: 'fares:all',
        byRoute: (routeId) => `fares:route:${routeId}`
    },
    transitPasses: {
        all: 'transit_passes:all',
        byType: (type) => `transit_passes:${type}`
    },

    // Metadata
    metadata: 'cache:metadata',
    health: 'health:status',
    lastFetch: 'last_fetch',
    
    // Statistics
    stats: 'cache:stats'
};

module.exports = {
    config,
    cacheKeys,
    validateConfig
}; 