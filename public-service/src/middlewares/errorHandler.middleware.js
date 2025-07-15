const { logger } = require('../config/logger');

/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
    // Log the error
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        params: req.params,
        query: req.query
    });

    // Determine error response
    let status = err.status || err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Don't expose internal errors in production
    const env = process.env.NODE_ENV || 'development';
    if (env === 'production' && status === 500) {
        message = 'Internal Server Error';
    }

    // Send error response
    res.status(status).json({
        success: false,
        error: {
            message,
            status,
            ...(env !== 'production' && { stack: err.stack })
        },
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
    });
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
    logger.warn('Route not found', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(404).json({
        success: false,
        error: {
            message: 'Route not found',
            status: 404
        },
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
    });
}

/**
 * Async error wrapper to catch async errors
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler
}; 