const httpProxy = require('express-http-proxy');
const CircuitBreaker = require('opossum');
const CustomError = require('../utils/CustomError');
const Service = require('../models/service.model');
const ServiceInstance = require('../models/serviceInstance.model');
const { logger } = require('../config/logger');

class RoutingService {
    constructor() {
        this.breakerOptions = {
            timeout: 30000,
            errorThresholdPercentage: 50,
            resetTimeout: 30000,
        };
        
        // Circuit breaker for proxy requests
        this.proxyBreaker = new CircuitBreaker(this.proxyServiceRequest.bind(this), this.breakerOptions);
        this.proxyBreaker.fallback(() => {
            throw new CustomError('Circuit breaker: service temporarily unavailable', 503);
        });
    }

    /**
     * Find service instance by endpoint
     */
    async findServiceInstanceByEndpoint(endPoint) {
        try {
            const service = await Service.findOne({
                where: { 
                    endPoint: endPoint,
                    status: 'active'
                },
                include: [{
                    model: ServiceInstance,
                    as: 'instances',
                    where: { 
                        status: 'active',
                        isHealthy: true 
                    },
                    required: false
                }]
            });

            if (!service || !service.instances || service.instances.length === 0) {
                return null;
            }

            return service;
        } catch (error) {
            logger.error('Error finding service instance:', error);
            throw new CustomError('Error finding service instance', 500);
        }
    }

    /**
     * Select best instance using round-robin or least connections
     */
    selectInstance(instances) {
        if (!instances || instances.length === 0) {
            return null;
        }

        if (instances.length === 1) {
            return instances[0];
        }

        // Simple round-robin selection
        // In a production environment, you might want to implement more sophisticated load balancing
        const randomIndex = Math.floor(Math.random() * instances.length);
        return instances[randomIndex];
    }

    /**
     * Proxy service request with circuit breaker
     */
    async proxyServiceRequest(req, res, serviceInstance, endPoint, proxyEndpoint) {
        return new Promise((resolve, reject) => {
            let path = `http://${serviceInstance.host}:${serviceInstance.port}`;
            if (proxyEndpoint) {
                path = `${path}/${proxyEndpoint.replace(/^\/+|\/+$/g, '')}`;
            }

            const proxyMiddleware = httpProxy(path, {
                proxyTimeout: 10000,
                timeout: 10000,
                proxyReqPathResolver: function (req) {
                    const originalPath = req.url;
                    const newPath = originalPath.replace(`/route/${endPoint}`, '');
                    return newPath || '/';
                },
                proxyReqOptDecorator: function(proxyReqOpts, srcReq) {
                    // Add headers for tracing
                    proxyReqOpts.headers['x-forwarded-for'] = srcReq.ip;
                    proxyReqOpts.headers['x-forwarded-proto'] = srcReq.protocol;
                    proxyReqOpts.headers['x-forwarded-host'] = srcReq.get('host');
                    return proxyReqOpts;
                }
            });

            res.on('finish', () => {
                logger.info('Proxy request completed', {
                    endPoint,
                    instance: serviceInstance.id,
                    path
                });
                resolve();
            });

            proxyMiddleware(req, res, (proxyError) => {
                if (proxyError) {
                    logger.error('Proxy error:', {
                        service: endPoint,
                        instance: serviceInstance.id,
                        error: proxyError.message,
                        code: proxyError.code,
                    });
                    reject(proxyError);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Route request to appropriate service instance
     */
    async routeRequest(req, res, endPoint, proxyEndpoint) {
        try {
            // Find service and its instances
            const service = await this.findServiceInstanceByEndpoint(endPoint);
            
            if (!service) {
                throw new CustomError(`Service '${endPoint}' not found or no healthy instances available`, 404);
            }

            // Select instance using load balancing
            const selectedInstance = this.selectInstance(service.instances);
            
            if (!selectedInstance) {
                throw new CustomError('No healthy instances available', 503);
            }

            logger.info('Routing request to service', {
                endPoint,
                instanceId: selectedInstance.id,
                host: selectedInstance.host,
                port: selectedInstance.port
            });

            // Proxy the request using circuit breaker
            await this.proxyBreaker.fire(req, res, selectedInstance, endPoint, proxyEndpoint);

        } catch (error) {
            logger.error('Routing error:', {
                endPoint,
                error: error.message
            });
            
            if (error instanceof CustomError) {
                throw error;
            }
            
            throw new CustomError(`Routing error: ${error.message}`, 500);
        }
    }

    /**
     * Check service health
     */
    async checkServiceHealth(endPoint) {
        try {
            const service = await this.findServiceInstanceByEndpoint(endPoint);
            
            if (!service) {
                return {
                    healthy: false,
                    message: 'Service not found'
                };
            }

            const healthyInstances = service.instances.filter(instance => instance.isHealthy);
            
            return {
                healthy: healthyInstances.length > 0,
                totalInstances: service.instances.length,
                healthyInstances: healthyInstances.length,
                instances: service.instances.map(instance => ({
                    id: instance.id,
                    host: instance.host,
                    port: instance.port,
                    isHealthy: instance.isHealthy,
                    status: instance.status
                }))
            };
        } catch (error) {
            logger.error('Health check error:', error);
            return {
                healthy: false,
                message: error.message
            };
        }
    }
}

module.exports = new RoutingService();
