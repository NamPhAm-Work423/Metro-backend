const asyncErrorHandler = require('../helpers/errorHandler.helper');
const CustomError = require('../utils/CustomError');
const routingService = require('../services/routing.service');
const { logger } = require('../config/logger');

const routingController = {
    /**
     * Route request to appropriate service
     */
    useService: asyncErrorHandler(async (req, res, next) => {
        const endPoint = req.params.endPoint;
        const proxyEndpoint = req.params[0];

        try {
            logger.info('Routing request', {
                endPoint,
                proxyEndpoint,
                method: req.method,
                path: req.originalUrl,
                userAgent: req.get('User-Agent'),
                ip: req.ip
            });

            await routingService.routeRequest(req, res, endPoint, proxyEndpoint);

        } catch (error) {
            logger.error('Routing controller error:', {
                endPoint,
                error: error.message,
                stack: error.stack
            });

            if (error instanceof CustomError) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                    error: 'ROUTING_ERROR'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Internal routing error',
                error: 'INTERNAL_ERROR'
            });
        }
    }),

    /**
     * Check service health
     */
    checkServiceHealth: asyncErrorHandler(async (req, res, next) => {
        const endPoint = req.params.endPoint;

        try {
            const healthStatus = await routingService.checkServiceHealth(endPoint);

            res.status(healthStatus.healthy ? 200 : 503).json({
                success: true,
                message: healthStatus.healthy ? 'Service is healthy' : 'Service is unhealthy',
                data: healthStatus
            });

        } catch (error) {
            logger.error('Health check error:', {
                endPoint,
                error: error.message
            });

            res.status(500).json({
                success: false,
                message: 'Health check failed',
                error: 'HEALTH_CHECK_ERROR'
            });
        }
    })
};

module.exports = routingController;
