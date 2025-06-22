const { logger } = require('../config/logger');

module.exports = {errorHandler: (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    logger.error("API Gateway Error:", {
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
}
}