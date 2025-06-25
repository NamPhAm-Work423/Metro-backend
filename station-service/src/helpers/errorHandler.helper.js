const { logger } = require('../config/logger');

/**
 * Async error handler wrapper
 * Catches async errors and passes them to Express error middleware
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncErrorHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = this.constructor.name;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Custom error class for validation errors
 */
class ValidationError extends AppError {
    constructor(message, errors = []) {
        super(message, 400);
        this.errors = errors;
        this.name = 'ValidationError';
    }
}

/**
 * Custom error class for not found errors
 */
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404);
        this.name = 'NotFoundError';
    }
}

/**
 * Custom error class for authorization errors
 */
class AuthorizationError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 403);
        this.name = 'AuthorizationError';
    }
}

/**
 * Custom error class for authentication errors
 */
class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401);
        this.name = 'AuthenticationError';
    }
}

/**
 * Handle different types of errors
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (error, req, res, next) => {
    let err = { ...error };
    err.message = error.message;

    // Log error
    logger.error('Global error handler', {
        error: err.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
        headers: req.headers
    });

    // Sequelize validation error
    if (error.name === 'SequelizeValidationError') {
        const message = 'Validation Error';
        const errors = error.errors.map(e => ({
            field: e.path,
            message: e.message,
            value: e.value
        }));
        err = new ValidationError(message, errors);
    }

    // Sequelize unique constraint error
    if (error.name === 'SequelizeUniqueConstraintError') {
        const message = 'Duplicate entry';
        const errors = error.errors.map(e => ({
            field: e.path,
            message: `${e.path} must be unique`,
            value: e.value
        }));
        err = new ValidationError(message, errors);
    }

    // Sequelize foreign key constraint error
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        const message = 'Foreign key constraint error';
        err = new ValidationError(message);
    }

    // Sequelize database connection error
    if (error.name === 'SequelizeConnectionError') {
        const message = 'Database connection error';
        err = new AppError(message, 500);
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        err = new AuthenticationError(message);
    }

    if (error.name === 'TokenExpiredError') {
        const message = 'Token expired';
        err = new AuthenticationError(message);
    }

    // Cast error (invalid ObjectId for MongoDB, invalid UUID for PostgreSQL)
    if (error.name === 'CastError' || (error.message && error.message.includes('invalid input syntax for type uuid'))) {
        const message = 'Invalid ID format';
        err = new ValidationError(message);
    }

    // Send error response
    sendErrorResponse(err, res);
};

/**
 * Send error response
 * @param {Error} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorResponse = (err, res) => {
    // Ensure statusCode exists
    err.statusCode = err.statusCode || 500;

    // Development vs Production error responses
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        sendErrorProd(err, res);
    }
};

/**
 * Send detailed error response for development
 * @param {Error} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        error: {
            message: err.message,
            stack: err.stack,
            ...err
        }
    });
};

/**
 * Send simplified error response for production
 * @param {Error} err - Error object
 * @param {Object} res - Express response object
 */
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        const response = {
            success: false,
            message: err.message
        };

        // Add errors array for validation errors
        if (err.errors) {
            response.errors = err.errors;
        }

        res.status(err.statusCode).json(response);
    } else {
        // Programming or other unknown error: don't leak error details
        logger.error('Unknown error occurred', {
            error: err.message,
            stack: err.stack
        });

        res.status(500).json({
            success: false,
            message: 'Something went wrong'
        });
    }
};

module.exports = {
    asyncErrorHandler,
    globalErrorHandler,
    AppError,
    ValidationError,
    NotFoundError,
    AuthorizationError,
    AuthenticationError
}; 