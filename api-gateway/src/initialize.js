const { initializeRedis } = require('./config/redis');
const { logger } = require('./config/logger');
const { storeInstances } = require('./services/loadBalancer.service');
const routeCache = require('./services/routeCache.service');
const config = require('./config.json');

async function initializeServices() {
    try {
        logger.info('Initializing services from config...');
        for (const serviceConfig of config.services) {
            // Sync instances to Redis for load balancing (if needed)
            if (serviceConfig.instances && serviceConfig.instances.length > 0) {
                const redisInstances = serviceConfig.instances.map((instance) => ({
                    id: `${instance.host}:${instance.port}`,
                    host: instance.host,
                    port: instance.port,
                    status: true, // Mark as active initially
                    endpoint: serviceConfig.endPoint
                }));
                await storeInstances(serviceConfig.endPoint, redisInstances);
                logger.info(`${redisInstances.length} instances synced to Redis for service '${serviceConfig.name}'`);
            }
        }
        logger.info('Services initialization completed');
    } catch (error) {
        logger.error('Error initializing services:', error);
        throw error;
    }
}

module.exports = async function initialize() {
    await initializeRedis();
    await initializeServices();
    // Preload cache for all active services after initialization
    try {
        logger.info('Starting cache preload for active services...');
        // Small delay to ensure all services are fully initialized
        await new Promise(resolve => setTimeout(resolve, 1000));
        const preloadResult = await routeCache.preloadAllActiveServices();
        if (preloadResult.success) {
            logger.info(`Cache preload successful: ${preloadResult.preloaded}/${preloadResult.total} services cached`);
        } else {
            logger.warn('Cache preload failed', { error: preloadResult.error });
        }
    } catch (error) {
        logger.error('Error during cache preload:', error);
        // Don't throw - cache preload failure shouldn't prevent API Gateway startup
    }
};
