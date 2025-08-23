const { logger } = require('../config/logger');

/**
 * Global Error Handler
 * Handles all unhandled errors in the webhook service
 */
const errorHandler = (error, req, res, next) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let errorCode = 'INTERNAL_ERROR';

    // Log the error with full details
    logger.error('Global error handler triggered', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.headers['x-request-id'],
        timestamp: new Date().toISOString()
    });

    // Handle specific error types
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        errorCode = 'VALIDATION_ERROR';
    } else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid data format';
        errorCode = 'CAST_ERROR';
    } else if (error.code === 11000) {
        // MongoDB duplicate key error
        statusCode = 409;
        message = 'Duplicate resource';
        errorCode = 'DUPLICATE_ERROR';
    } else if (error.name === 'MongoNetworkError') {
        statusCode = 503;
        message = 'Database connection error';
        errorCode = 'DATABASE_ERROR';
    } else if (error.name === 'RedisConnectionError') {
        statusCode = 503;
        message = 'Cache service unavailable';
        errorCode = 'CACHE_ERROR';
    } else if (error.name === 'KafkaJSError') {
        statusCode = 503;
        message = 'Message queue service unavailable';
        errorCode = 'KAFKA_ERROR';
    } else if (error.message?.includes('PayPal')) {
        statusCode = 422;
        message = 'PayPal webhook processing error';
        errorCode = 'PAYPAL_ERROR';
    } else if (error.status) {
        statusCode = error.status;
        message = error.message;
        errorCode = error.code || 'HTTP_ERROR';
    }

    // Response format
    const errorResponse = {
        success: false,
        error: errorCode,
        message: message,
        timestamp: new Date().toISOString()
    };

    // Add error details in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.details = {
            originalError: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method
        };
    }

    // Add request ID if present
    if (req.headers['x-request-id']) {
        errorResponse.requestId = req.headers['x-request-id'];
    }

    res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res) => {
    logger.warn('Route not found', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(404).json({
        success: false,
        error: 'ROUTE_NOT_FOUND',
        message: 'The requested endpoint was not found',
        timestamp: new Date().toISOString(),
        availableEndpoints: {
            paypal: '/v1/paypal/*',
            health: '/health',
            metrics: '/metrics',
            docs: '/api-docs'
        }
    });
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Custom Error Class
 */
class WebhookError extends Error {
    constructor(message, statusCode = 500, errorCode = 'WEBHOOK_ERROR') {
        super(message);
        this.name = 'WebhookError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * PayPal specific error class
 */
class PayPalWebhookError extends WebhookError {
    constructor(message, statusCode = 422) {
        super(message, statusCode, 'PAYPAL_WEBHOOK_ERROR');
        this.name = 'PayPalWebhookError';
    }
}

/**
 * Validation Error Handler
 */
const validationErrorHandler = (errors) => {
    const formattedErrors = errors.map(error => ({
        field: error.param || error.path,
        message: error.msg || error.message,
        value: error.value
    }));

    return new WebhookError(
        'Validation failed',
        400,
        'VALIDATION_ERROR'
    );
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    WebhookError,
    PayPalWebhookError,
    validationErrorHandler
};
