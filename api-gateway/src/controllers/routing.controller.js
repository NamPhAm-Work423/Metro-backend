const asyncErrorHandler = require('../helpers/errorHandler.helper');
const CustomError = require('../utils/customError');
const routingService = require('../services/routing.service');
const { logger } = require('../config/logger');
const { addCustomSpan  } = require('../tracing');

const routingController = {
    /**
     * Route request to appropriate service
     */
    useService: asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan ('api-gateway.route-request', async (span) => {
            // Decode URL-encoded endpoint parameter
            let endPoint = decodeURIComponent(req.params.endPoint);
            let proxyEndpoint = req.params[0];
            
            // Add initial span attributes
            span.setAttributes({
                'gateway.endpoint': endPoint,
                'gateway.proxy_endpoint': proxyEndpoint || '',
                'http.method': req.method,
                'http.url': req.originalUrl,
                'request.ip': req.ip,
                'request.user_agent': req.get('User-Agent') || '',
                'gateway.operation': 'route_request'
            });
            
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
                
                // Update span attributes with processed paths
                span.setAttributes({
                    'gateway.endpoint_processed': endPoint,
                    'gateway.proxy_endpoint_processed': proxyEndpoint,
                    'gateway.path_decoded': true
                });
            }

            try {
                logger.traceInfo('Routing request started', {
                    endPoint,
                    proxyEndpoint,
                    method: req.method,
                    path: req.originalUrl,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip
                });

                // Route request with tracing
                await addCustomSpan ('api-gateway.proxy-to-service', async (proxySpan) => {
                    proxySpan.setAttributes({
                        'gateway.target_service': endPoint,
                        'gateway.target_path': proxyEndpoint || '/',
                        'proxy.operation': 'forward_request'
                    });
                    
                    await routingService.routeRequest(req, res, endPoint, proxyEndpoint);
                    
                    proxySpan.setAttributes({
                        'proxy.success': true,
                        'http.status_code': res.statusCode || 0
                    });
                });

                span.setAttributes({
                    'gateway.routing_success': true,
                    'http.response_status': res.statusCode || 0
                });

            } catch (error) {
                span.recordException(error);
                span.setAttributes({
                    'gateway.routing_success': false,
                    'error.type': error.constructor.name,
                    'error.message': error.message
                });

                logger.traceError('Routing controller error', error, {
                    endPoint,
                    proxyEndpoint,
                    method: req.method,
                    path: req.originalUrl
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
        });
    }),

    /**
     * Check service health
     */
    checkServiceHealth: asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan ('api-gateway.check-service-health', async (span) => {
            const endPoint = req.params.endPoint;

            // Add initial span attributes
            span.setAttributes({
                'gateway.endpoint': endPoint,
                'http.method': req.method,
                'http.url': req.originalUrl,
                'gateway.operation': 'check_service_health'
            });

            try {
                const healthStatus = await routingService.checkServiceHealth(endPoint);

                span.setAttributes({
                    'health.healthy': Boolean(healthStatus?.healthy),
                    'http.response_status': healthStatus?.healthy ? 200 : 503
                });

                res.status(healthStatus.healthy ? 200 : 503).json({
                    success: true,
                    message: healthStatus.healthy ? 'Service is healthy' : 'Service is unhealthy',
                    data: healthStatus
                });

            } catch (error) {
                span.recordException(error);
                span.setAttributes({
                    'error.type': error.constructor?.name || 'Error',
                    'error.message': error.message,
                    'http.response_status': 500
                });

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
        });
    })
};

module.exports = routingController;
