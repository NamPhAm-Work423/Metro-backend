const httpProxy = require('express-http-proxy');
const CircuitBreaker = require('opossum');
const CustomError = require('../utils/customError');
const { logger } = require('../config/logger');
const jwt = require('jsonwebtoken');
const routeCache = require('./routeCache.service');

class RoutingService {
    constructor() {
        this.breakerOptions = {
            timeout: 30000,
            errorThresholdPercentage: 50,
            resetTimeout: 30000,
        };
        
        // Circuit breaker for proxy requests
        this.proxyBreaker = new CircuitBreaker(this.proxyServiceRequest.bind(this), this.breakerOptions);
        this.proxyBreaker.fallback((err, req, res, selectedInstance, endPoint, proxyEndpoint) => {
            // Don't throw error here, let the controller handle it
            return Promise.reject(new CustomError('Circuit breaker: service temporarily unavailable', 503));
        });
    }

    /**
     * Generate secure service-to-service JWT token
     */
    generateServiceToken(user) {
        if (!process.env.SERVICE_JWT_SECRET) {
            throw new Error('SERVICE_JWT_SECRET environment variable is required');
        }


        const payload = {
            userId: user.id,
            email: user.email,
            roles: user.roles,
            iss: 'api-gateway',
            aud: 'internal-services',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (5 * 60) // 5 minutes expiry
        };

        const token = jwt.sign(
            payload,
            process.env.SERVICE_JWT_SECRET,
            { algorithm: 'HS256' }
        );



        return token;
    }

    /**
     * Find service instance by endpoint (preloaded cache only)
     */
    async findServiceInstanceByEndpoint(endPoint) {
        // Only use preloaded cache - no database fallback
        const cachedRoute = await routeCache.getRoute(endPoint);
        const healthyInstances = await routeCache.getHealthyServiceInstances(endPoint);
        
        if (!cachedRoute) {
            logger.warn('Service not found in cache - not healthy or doesn\'t exist', { endPoint });
            return null;
        }

        if (!healthyInstances || healthyInstances.length === 0) {
            logger.warn('No healthy instances available', { endPoint });
            return null;
        }

        logger.debug('Service found from preloaded cache', { 
            endPoint, 
            healthyInstances: healthyInstances.length,
            cacheSource: 'preloaded'
        });

        // Return service with healthy instances
        return {
            id: cachedRoute.serviceKey,
            name: cachedRoute.serviceName,
            endPoint: cachedRoute.serviceKey,
            timeout: parseInt(cachedRoute.timeout) || 5000,
            retries: parseInt(cachedRoute.retries) || 3,
            instances: healthyInstances.map(instance => ({
                id: instance.id,
                host: instance.host,
                port: instance.port,
                weight: instance.weight || 1,
                region: instance.region || 'default',
                isHealthy: true, // Already filtered by loadbalancer
                status: 'active'
            }))
        };
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
            // Base path without the proxyEndpoint - let proxyReqPathResolver handle the path construction
            let path = `http://${serviceInstance.host}:${serviceInstance.port}`;
            // Don't append proxyEndpoint here - it will be handled by proxyReqPathResolver

            const proxyMiddleware = httpProxy(path, {
                proxyTimeout: 10000,
                timeout: 10000,
                preserveHostHdr: true,
                skipTooBusy: true,
                // Handle response errors and preserve status codes
                userResDecorator: function(proxyRes, proxyResData, userReq, userRes) {
                    // Set status code first
                    userRes.status(proxyRes.statusCode);
                    
                    // Check if response is JSON
                    const contentType = proxyRes.headers['content-type'] || '';
                    const isJSON = contentType.includes('application/json');
                    
                    if (isJSON) {
                        try {
                            // Parse response data
                            const responseString = proxyResData.toString('utf8');
                            const responseData = JSON.parse(responseString);
                            
                            logger.debug('Forwarding JSON response from downstream service', {
                                service: endPoint,
                                statusCode: proxyRes.statusCode,
                                path: userReq.url,
                                responseData: responseData
                            });
                            
                            return JSON.stringify(responseData);
                            
                        } catch (parseError) {
                            logger.error('Failed to parse JSON response', {
                                service: endPoint,
                                error: parseError.message,
                                responseData: proxyResData.toString('utf8').substring(0, 500)
                            });
                        }
                    }
                    
                    logger.debug('Forwarding non-JSON response from downstream service', {
                        service: endPoint,
                        statusCode: proxyRes.statusCode,
                        path: userReq.url,
                        contentType: contentType
                    });
                    
                    return proxyResData;
                },
                proxyReqPathResolver: function (req) {
                    const originalPath = req.url;
                    
                    const [pathPart, queryPart] = originalPath.split('?');
                    const queryString = queryPart ? `?${queryPart}` : '';
                    
                    let newPathPart;
                    
                    // Check if this is a guest route using the flag set by guest route middleware
                    const isGuestRoute = req.isGuestRoute === true;
                    
                    if (isGuestRoute) {
                        // For guest routes, proxy directly to the service's root paths
                        // The service handles its own route structure (e.g., /cache/status, /transport/routes)
                        if (proxyEndpoint) {
                            newPathPart = `/${proxyEndpoint}`;
                        } else {
                            newPathPart = `/`;
                        }
                    } else {
                        // For regular service routes, maintain the /v1/endPoint/ structure
                        if (proxyEndpoint) {
                            newPathPart = `/v1/${endPoint}/${proxyEndpoint}`;
                        } else {
                            newPathPart = `/v1/${endPoint}`;
                        }
                    }
                    
                    const newPath = newPathPart + queryString;
                    console.log(`Proxying: ${originalPath} -> ${newPath} (isGuestRoute: ${isGuestRoute})`);
                    return newPath;
                },
                onProxyReq: function(proxyReq, req, res) {
                    // onProxyReq is handled, detailed logging in proxyReqPathResolver
                }.bind(this),
                proxyReqOptDecorator: function(proxyReqOpts, srcReq) {
                    proxyReqOpts.headers['x-forwarded-for'] = srcReq.ip;
                    proxyReqOpts.headers['x-forwarded-proto'] = srcReq.protocol;
                    proxyReqOpts.headers['x-forwarded-host'] = srcReq.get('host');
                    
                    // Override origin header: Backend services should only accept requests from API Gateway
                    // This prevents frontend origin (localhost:5173) from being forwarded to backend services
                    proxyReqOpts.headers['origin'] = process.env.API_GATEWAY_ORIGIN || 'http://localhost:8000';
                    
                    if (srcReq.user) {
                        const serviceToken = this.generateServiceToken(srcReq.user);
                        proxyReqOpts.headers['x-service-auth'] = `Bearer ${serviceToken}`;
                        
                        // Remove potentially dangerous headers from client
                        delete proxyReqOpts.headers['x-user-id'];
                        delete proxyReqOpts.headers['x-user-email'];
                        delete proxyReqOpts.headers['x-user-roles'];
                        
                        logger.info('Service authentication added', {
                            userId: srcReq.user.id,
                            roles: srcReq.user.roles,
                            tokenPrefix: serviceToken.substring(0, 20) + '...'
                        });
                    }
                    
                    return proxyReqOpts;
                }.bind(this),
                userResHeaderDecorator: function(headers, proxyRes, userReq, userRes) {
                    delete headers['access-control-allow-origin'];
                    delete headers['access-control-allow-credentials'];
                    delete headers['access-control-allow-methods'];
                    delete headers['access-control-allow-headers'];
                    delete headers['access-control-expose-headers'];
                    delete headers['access-control-max-age'];

                    
                    return headers;
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
                    
                    // Create a more specific error with proper status code
                    const statusCode = proxyError.statusCode || proxyError.status || 503;
                    const customError = new CustomError(
                        proxyError.message || `Service ${endPoint} unavailable`, 
                        statusCode
                    );
                    reject(customError);
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
     * Check service health (preloaded cache only)
     */
    async checkServiceHealth(endPoint) {
        const service = await this.findServiceInstanceByEndpoint(endPoint);
        
        if (!service) {
            return {
                healthy: false,
                message: 'Service not found - not healthy or doesn\'t exist',
                cached: true
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
            })),
            cached: true
        };
    }

    /**
     * Invalidate route cache (for admin/management use)
     */
    async invalidateRouteCache(endPoint) {
        try {
            if (endPoint) {
                await routeCache.invalidateRoute(endPoint);
                logger.info('Route cache invalidated', { endPoint });
            } else {
                await routeCache.invalidateAllRoutes();
                logger.info('All route caches invalidated');
            }
            return true;
        } catch (error) {
            logger.error('Error invalidating route cache', { endPoint, error: error.message });
            return false;
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats() {
        try {
            return await routeCache.getCacheStats();
        } catch (error) {
            logger.error('Error getting cache stats', { error: error.message });
            return { error: error.message };
        }
    }
}

module.exports = new RoutingService();
