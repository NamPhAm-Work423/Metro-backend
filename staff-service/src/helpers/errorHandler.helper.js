const { logger } = require('../config/logger');

/**
 * Async error handler wrapper
 * Wraps async functions to catch errors and pass them to the error handling middleware
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - The wrapped function
 */
const asyncErrorHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = asyncErrorHandler; 