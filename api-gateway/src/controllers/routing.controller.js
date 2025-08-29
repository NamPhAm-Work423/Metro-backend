const asyncErrorHandler = require('../helpers/errorHandler.helper');
const CustomError = require('../utils/customError');
const routingService = require('../services/routing.service');
const { logger } = require('../config/logger');

const routingController = {
    /**
     * Route request to appropriate service
     */
    useService: asyncErrorHandler(async (req, res, next) => {
        // Decode URL-encoded endpoint parameter
        let endPoint = decodeURIComponent(req.params.endPoint);
        let proxyEndpoint = req.params[0];
        
        // Handle URL-encoded paths like "passengers%2Fme" -> "passengers/me"
        // Split on the first slash to separate service endpoint from path
        if (endPoint.includes('/')) {
            const parts = endPoint.split('/');
            endPoint = parts[0]; // e.g., "passengers"
            const remainingPath = parts.slice(1).join('/');
            
            // Combine with existing proxyEndpoint if any
            if (proxyEndpoint) {
                proxyEndpoint = `${remainingPath}/${proxyEndpoint}`;
            } else {
                proxyEndpoint = remainingPath;
            }
        }

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

            // Check if response has already been sent or status set by proxy
            if (res.headersSent) {
                logger.warn('Response already sent, skipping error response', {
                    endPoint,
                    error: error.message
                });
                return;
            }

            if (typeof res.statusCode === 'number' && res.statusCode !== 200) {
                logger.info('Response status already set by proxy, preserving it', {
                    endPoint,
                    statusCode: res.statusCode,
                    error: error.message
                });
                return;
            }

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
