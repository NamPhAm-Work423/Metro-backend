const { logger } = require('../config/logger');

/**
 * Validation middleware for ticket-related requests
 * Follows Single Responsibility Principle - only handles validation
 */
class TicketValidationMiddleware {
    /**
     * Validate getTicketsByRoutes request parameters
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    static validateGetTicketsByRoutes(req, res, next) {
        try {
            const { routeIds, statuses } = req.query;

            // Validate routeIds
            if (!routeIds) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_ROUTE_IDS',
                        message: 'Route IDs are required',
                        details: 'Please provide routeIds as query parameter'
                    },
                    timestamp: new Date().toISOString(),
                    requestId: req.id || 'unknown'
                });
            }

            // Parse and validate routeIds
            const parsedRouteIds = Array.isArray(routeIds) ? routeIds : routeIds.split(',');
            if (parsedRouteIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_ROUTE_IDS',
                        message: 'Route IDs cannot be empty',
                        details: 'Please provide at least one valid route ID'
                    },
                    timestamp: new Date().toISOString(),
                    requestId: req.id || 'unknown'
                });
            }

            // Validate routeId format (basic validation)
            const invalidRouteIds = parsedRouteIds.filter(routeId => 
                !routeId || typeof routeId !== 'string' || routeId.trim().length === 0
            );
            if (invalidRouteIds.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_ROUTE_ID_FORMAT',
                        message: 'Invalid route ID format',
                        details: 'Route IDs must be non-empty strings'
                    },
                    timestamp: new Date().toISOString(),
                    requestId: req.id || 'unknown'
                });
            }

            // Parse and validate statuses (optional)
            const parsedStatuses = statuses 
                ? (Array.isArray(statuses) ? statuses : statuses.split(','))
                : ['active', 'inactive'];

            // Validate status values
            const validStatuses = ['active', 'inactive', 'used', 'cancelled', 'expired', 'pending_payment'];
            const invalidStatuses = parsedStatuses.filter(status => !validStatuses.includes(status));
            if (invalidStatuses.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_STATUS_VALUES',
                        message: 'Invalid ticket status values',
                        details: `Invalid statuses: ${invalidStatuses.join(', ')}. Valid statuses: ${validStatuses.join(', ')}`
                    },
                    timestamp: new Date().toISOString(),
                    requestId: req.id || 'unknown'
                });
            }

            // Add validated data to request object
            req.validatedQuery = {
                routeIds: parsedRouteIds.map(id => id.trim()),
                statuses: parsedStatuses
            };

            logger.debug('Request validation passed', {
                routeIds: req.validatedQuery.routeIds,
                statuses: req.validatedQuery.statuses,
                requestId: req.id || 'unknown'
            });

            next();

        } catch (error) {
            logger.error('Validation middleware error', {
                error: error.message,
                stack: error.stack,
                requestId: req.id || 'unknown'
            });

            res.status(500).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Internal validation error',
                    details: 'An error occurred during request validation'
                },
                timestamp: new Date().toISOString(),
                requestId: req.id || 'unknown'
            });
        }
    }

    /**
     * Validate pagination parameters
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    static validatePagination(req, res, next) {
        try {
            const { page, limit } = req.query;

            // Set default values
            const pageNum = page ? parseInt(page, 10) : 1;
            const limitNum = limit ? parseInt(limit, 10) : 50;

            // Validate page
            if (isNaN(pageNum) || pageNum < 1) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_PAGE_NUMBER',
                        message: 'Invalid page number',
                        details: 'Page must be a positive integer'
                    },
                    timestamp: new Date().toISOString(),
                    requestId: req.id || 'unknown'
                });
            }

            // Validate limit
            if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_LIMIT',
                        message: 'Invalid limit value',
                        details: 'Limit must be between 1 and 1000'
                    },
                    timestamp: new Date().toISOString(),
                    requestId: req.id || 'unknown'
                });
            }

            // Add pagination to request object
            req.pagination = {
                page: pageNum,
                limit: limitNum,
                offset: (pageNum - 1) * limitNum
            };

            next();

        } catch (error) {
            logger.error('Pagination validation error', {
                error: error.message,
                stack: error.stack,
                requestId: req.id || 'unknown'
            });

            res.status(500).json({
                success: false,
                error: {
                    code: 'PAGINATION_VALIDATION_ERROR',
                    message: 'Internal pagination validation error',
                    details: 'An error occurred during pagination validation'
                },
                timestamp: new Date().toISOString(),
                requestId: req.id || 'unknown'
            });
        }
    }
}

module.exports = TicketValidationMiddleware;
