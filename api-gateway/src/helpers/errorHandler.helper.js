/**
 * @description: This function is used to handle async errors
 * @param {Function} func - The function to handle
 * @returns {Function} - The function to handle
 */
const asyncErrorHandler = (func) => {
    return (req, res, next) => {
        func(req, res, next).catch(err => next(err));
    };
};

module.exports = asyncErrorHandler;