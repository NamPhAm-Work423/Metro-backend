const redis = require('../config/redis');
const { logger } = require('../config/logger');
const Config = require('../config');
const config = Config();

class RouteCacheService {
    constructor() {
        // Use api-gateway prefix for route cache
        const API_GATEWAY_PREFIX = process.env.REDIS_KEY_PREFIX || 'api-gateway:';
        this.routePrefix = `${API_GATEWAY_PREFIX}route-cache:`;
        this.instancePrefix = `${API_GATEWAY_PREFIX}service-instances:`;
        
        // Cache TTL settings (health check runs every 1 minute)
        this.routeTTL = 3600; // 1 hour for routes
        this.instanceTTL = 1800; // 30 minutes for service instances (3x health check interval for safety)
    }

    _getRouteKey(serviceKey) {
        return `${this.routePrefix}${serviceKey}`;
    }

    _getInstanceKey(serviceKey) {
        return `${this.instancePrefix}${serviceKey}`;
    }

    /**
     * Get route from cache (cache-first approach)
     */
    async getRoute(serviceKey) {
        try {
            const redisClient = redis.getClient();
            if (!redisClient) {
                logger.warn('Redis not available, falling back to database');
                return await this._getRouteFromDB(serviceKey);
            }

            // Check key type first to avoid WRONGTYPE errors
            const routeKey = this._getRouteKey(serviceKey);
            const keyType = await redisClient.type(routeKey);
            
            if (keyType !== 'hash' && keyType !== 'none') {
                logger.warn(`Route cache key has wrong type: ${routeKey} (type: ${keyType}), clearing and rebuilding`);
                await redisClient.del(routeKey);
                const dbRoute = await this._getRouteFromDB(serviceKey);
                if (dbRoute) {
                    await this._cacheRoute(serviceKey, dbRoute);
                }
                return dbRoute;
            }

            // Try cache first
            const cached = await redisClient.hGetAll(routeKey);
            if (cached && Object.keys(cached).length > 0) {
                logger.debug(`Route cache HIT: ${serviceKey}`, { fields: Object.keys(cached) });
                return cached;
            }

            // Cache miss - service not healthy or doesn't exist
            logger.warn(`Route cache MISS: ${serviceKey} - service not preloaded (not healthy or doesn't exist)`);
            return null;
        } catch (error) {
            logger.error(`Route cache error for ${serviceKey}`, error);
            return null;
        }
    }

    /**
     * Get service instances from cache (cache-first approach)
     */
    async getServiceInstances(serviceKey) {
        try {
            const redisClient = redis.getClient();
            if (!redisClient) {
                logger.warn('Redis not available, falling back to database');
                return await this._getInstancesFromDB(serviceKey);
            }

            // Check key type first to avoid WRONGTYPE errors
            const instanceKey = this._getInstanceKey(serviceKey);
            const keyType = await redisClient.type(instanceKey);
            
            if (keyType !== 'string' && keyType !== 'none') {
                logger.warn(`Instance cache key has wrong type: ${instanceKey} (type: ${keyType}), clearing and rebuilding`);
                await redisClient.del(instanceKey);
                const dbInstances = await this._getInstancesFromDB(serviceKey);
                if (dbInstances && dbInstances.length > 0) {
                    await this._cacheInstances(serviceKey, dbInstances);
                }
                return dbInstances;
            }

            // Try cache first
            const cached = await redisClient.get(instanceKey);
            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    if (data && data.instances) {
                        logger.debug(`Instances cache HIT: ${serviceKey}`, { count: data.instances.length });
                        return data.instances;
                    }
                } catch (parseError) {
                    logger.warn(`Invalid cached data for ${serviceKey}, clearing cache`, { error: parseError.message });
                    await redisClient.del(instanceKey);
                }
            }

            // Cache miss - service not healthy or doesn't exist  
            logger.warn(`Instances cache MISS: ${serviceKey} - service not preloaded (not healthy or doesn't exist)`);
            return [];
        } catch (error) {
            logger.error(`Instance cache error for ${serviceKey}`, error);
            return [];
        }
    }

    /**
     * Get healthy instances using loadbalancer health check results
     */
    async getHealthyServiceInstances(serviceKey) {
        try {
            const redisClient = redis.getClient();
            if (!redisClient) {
                logger.warn('Redis not available, falling back to database');
                return await this._getInstancesFromDB(serviceKey);
            }

            // Get instances from cache (or database if not cached)
            const allInstances = await this.getServiceInstances(serviceKey);
            if (!allInstances || allInstances.length === 0) return [];

            const healthyInstances = [];
            
            for (const instance of allInstances) {
                try {
                    // Check loadbalancer health status
                    const loadbalancerKey = `loadbalancer:instances:service:${serviceKey}:${instance.host}:${instance.port}`;
                    
                    // Check key type first to avoid WRONGTYPE errors
                    const keyType = await redisClient.type(loadbalancerKey);
                    if (keyType !== 'hash' && keyType !== 'none') {
                        logger.warn(`Loadbalancer key has wrong type: ${loadbalancerKey} (type: ${keyType})`);
                        continue;
                    }
                    
                    // Health status is stored in the 'status' field of the hash
                    const healthStatus = await redisClient.hGet(loadbalancerKey, 'status');
                    
                    // If loadbalancer says it's healthy, include it
                    if (healthStatus === 'true') {
                        healthyInstances.push({
                            ...instance,
                            healthStatus: 'healthy',
                            lastHealthCheck: new Date().toISOString()
                        });
                        logger.debug(`Instance ${instance.host}:${instance.port} is healthy according to loadbalancer`, {
                            serviceKey,
                            loadbalancerKey
                        });
                    } else {
                        logger.debug(`Instance ${instance.host}:${instance.port} not healthy according to loadbalancer`, {
                            serviceKey,
                            loadbalancerKey,
                            healthStatus,
                            keyType
                        });
                    }
                } catch (instanceError) {
                    logger.warn(`Error checking health for instance ${instance.host}:${instance.port}`, {
                        serviceKey,
                        error: instanceError.message
                    });
                    // Continue with next instance instead of failing completely
                    continue;
                }
            }

            logger.debug(`Healthy instances for ${serviceKey}`, {
                total: allInstances.length,
                healthy: healthyInstances.length,
                healthyHosts: healthyInstances.map(i => `${i.host}:${i.port}`)
            });

            return healthyInstances;
        } catch (error) {
            logger.error(`Error getting healthy instances for ${serviceKey}`, error);
            return [];
        }
    }

    /**
     * Refresh cache for a specific service (route + instances)
     */
    async refreshServiceCache(serviceKey) {
        try {
            const redisClient = redis.getClient();
            if (!redisClient) return false;

            // Remove old cache
            await redisClient.del(this._getRouteKey(serviceKey));
            await redisClient.del(this._getInstanceKey(serviceKey));

            // Reload from database and cache
            const route = await this._getRouteFromDB(serviceKey);
            const instances = await this._getInstancesFromDB(serviceKey);

            if (route) await this._cacheRoute(serviceKey, route);
            if (instances && instances.length > 0) await this._cacheInstances(serviceKey, instances);

            logger.info(`Cache refreshed for service: ${serviceKey}`);
            return true;
        } catch (error) {
            logger.error(`Cache refresh error for ${serviceKey}`, error);
            return false;
        }
    }

    /**
     * Proactively preload cache for a healthy service (called by loadbalancer)
     */
    async preloadServiceCache(serviceKey) {
        try {
            const redisClient = redis.getClient();
            if (!redisClient) {
                logger.warn(`Redis not available for preloading cache: ${serviceKey}`);
                return false;
            }

            // Check if cache already exists and is fresh
            const routeKey = this._getRouteKey(serviceKey);
            const instanceKey = this._getInstanceKey(serviceKey);
            
            const routeExists = await redisClient.exists(routeKey);
            const instanceExists = await redisClient.exists(instanceKey);

            // If both caches exist, no need to preload (already cached)
            if (routeExists && instanceExists) {
                logger.debug(`Cache already exists for service: ${serviceKey}`);
                return true;
            }

            // Load from database and cache proactively
            const route = await this._getRouteFromDB(serviceKey);
            const instances = await this._getInstancesFromDB(serviceKey);

            let cachedRoute = false;
            let cachedInstances = false;

            if (route && !routeExists) {
                cachedRoute = await this._cacheRoute(serviceKey, route);
            }

            if (instances && instances.length > 0 && !instanceExists) {
                cachedInstances = await this._cacheInstances(serviceKey, instances);
            }

            if (cachedRoute || cachedInstances) {
                logger.info(`Service cache preloaded: ${serviceKey}`, {
                    route: cachedRoute ? 'cached' : 'skipped',
                    instances: cachedInstances ? `cached (${instances.length})` : 'skipped'
                });
            }

            return true;
        } catch (error) {
            logger.error(`Preload cache error for ${serviceKey}`, error);
            return false;
        }
    }

    /**
     * Preload all active services at startup
     */
    async preloadAllActiveServices() {
        try {
            logger.info('Starting preload of all active services...');
            
            // Get all active services from database
            const activeServices = config.services.filter(s => s.status === 'active');

            if (!activeServices || activeServices.length === 0) {
                logger.warn('No active services found to preload');
                return { success: true, preloaded: 0 };
            }

            let preloadedCount = 0;
            const errors = [];

            // Preload each service
            for (const service of activeServices) {
                try {
                    const success = await this.preloadServiceCache(service.endPoint);
                    if (success) {
                        preloadedCount++;
                    }
                } catch (error) {
                    errors.push({ service: service.endPoint, error: error.message });
                    logger.error(`Failed to preload service: ${service.endPoint}`, error);
                }
            }

            logger.info(`Preload completed: ${preloadedCount}/${activeServices.length} services cached`, {
                preloadedCount,
                totalServices: activeServices.length,
                errors: errors.length
            });

            return {
                success: true,
                preloaded: preloadedCount,
                total: activeServices.length,
                errors
            };

        } catch (error) {
            logger.error('Error during preload all services', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Private helper methods
    async _getRouteFromDB(serviceKey) {
        try {
            const service = config.services.find(s => s.endPoint === serviceKey);
            if (!service) return null;
            return {
                serviceKey: service.endPoint,
                serviceName: service.name,
                description: service.description || '',
                version: service.version || '',
                timeout: service.timeout || '',
                retries: service.retries || '',
                status: 'active'
            };
        } catch (error) {
            logger.error(`Config error for route ${serviceKey}`, error);
            return null;
        }
    }

    async _getInstancesFromDB(serviceKey) {
        try {
            const service = config.services.find(s => s.endPoint === serviceKey);
            if (!service || !service.instances) return [];
            return service.instances.map((instance, idx) => ({
                id: idx + 1,
                host: instance.host,
                port: instance.port,
                weight: instance.weight || 1,
                region: instance.region || '',
                isActive: true,
                healthStatus: 'unknown',
                lastHealthCheck: null
            }));
        } catch (error) {
            logger.error(`Config error for instances ${serviceKey}`, error);
            return [];
        }
    }

    async _cacheRoute(serviceKey, routeData) {
        try {
            const redisClient = redis.getClient();
            if (!redisClient) return false;

            // Clean the cache key first to avoid type conflicts
            await redisClient.del(this._getRouteKey(serviceKey));

            const cacheData = {
                ...routeData,
                cachedAt: new Date().toISOString()
            };

            // Convert all values to strings for Redis hSet
            const stringifiedData = {};
            for (const [key, value] of Object.entries(cacheData)) {
                if (value !== null && value !== undefined) {
                    stringifiedData[key] = String(value);
                }
            }

            if (Object.keys(stringifiedData).length === 0) {
                logger.warn(`No valid data to cache for ${serviceKey}`);
                return false;
            }

            await redisClient.hSet(this._getRouteKey(serviceKey), stringifiedData);
            await redisClient.expire(this._getRouteKey(serviceKey), this.routeTTL);
            logger.debug(`Route cached for ${serviceKey}`, { fields: Object.keys(stringifiedData) });
            return true;
        } catch (error) {
            logger.error(`Cache route error for ${serviceKey}`, error);
            return false;
        }
    }

    async _cacheInstances(serviceKey, instances) {
        try {
            const redisClient = redis.getClient();
            if (!redisClient) return false;

            // Clean the cache key first to avoid type conflicts
            await redisClient.del(this._getInstanceKey(serviceKey));

            const cacheData = {
                instances,
                cachedAt: new Date().toISOString()
            };

            await redisClient.set(
                this._getInstanceKey(serviceKey),
                JSON.stringify(cacheData),
                { EX: this.instanceTTL }
            );
            logger.debug(`Instances cached for ${serviceKey}`, { count: instances.length });
            return true;
        } catch (error) {
            logger.error(`Cache instances error for ${serviceKey}`, error);
            return false;
        }
    }
}

const routeCacheService = new RouteCacheService();
module.exports = routeCacheService; 