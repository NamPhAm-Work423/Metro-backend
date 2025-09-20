const { logger } = require('../config/logger');
const { addCustomSpan  } = require('../tracing');

module.exports = {errorHandler: (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Wrap error logging in a span to capture unhandled exceptions
    addCustomSpan ('auth.error', async (span) => {
        span.recordException(err);
        span.setAttributes({
            'http.status_code': err.statusCode,
            'error.message': err.message,
            'request.path': req.originalUrl,
            'request.method': req.method,
            'request.id': req.id || null
        });

        logger.error("Auth Service Error:", {
            statusCode: err.statusCode,
            message: err.message,
            stack: err.stack,
            path: req.originalUrl,
            method: req.method,
            requestId: req.id,
        });

        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            ...(process.env.NODE_ENV === 'development' && {
                stack: err.stack,
            }),
        });
    });
}
}