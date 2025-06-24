const { initializeRedis } = require('./config/redis');
const { logger } = require('./config/logger');
const Service = require('./models/service.model');
const ServiceInstance = require('./models/serviceInstance.model');
const { storeInstances } = require('./services/loadBalancer.service');
const config = require('./config.json');

async function initializeServices() {
    try {
        logger.info('Initializing services from config...');
        
        for (const serviceConfig of config.services) {
            // Check if service already exists
            let service = await Service.findOne({
                where: { name: serviceConfig.name }
            });

            if (!service) {
                // Create new service
                service = await Service.create({
                    name: serviceConfig.name,
                    endPoint: serviceConfig.endPoint,
                    description: serviceConfig.description,
                    version: serviceConfig.version || '1.0.0',
                    timeout: serviceConfig.timeout || 5000,
                    retries: serviceConfig.retries || 3,
                    authentication: serviceConfig.authentication || {},
                    circuitBreaker: serviceConfig.circuitBreaker || {},
                    loadBalancer: serviceConfig.loadBalancer || {},
                    rateLimit: serviceConfig.rateLimit || {},
                    status: serviceConfig.status || 'active'
                });
                logger.info(`Service '${serviceConfig.name}' created`, { serviceId: service.id });
            } else {
                // Update existing service
                await service.update({
                    endPoint: serviceConfig.endPoint,
                    description: serviceConfig.description,
                    version: serviceConfig.version || '1.0.0',
                    timeout: serviceConfig.timeout || 5000,
                    retries: serviceConfig.retries || 3,
                    authentication: serviceConfig.authentication || {},
                    circuitBreaker: serviceConfig.circuitBreaker || {},
                    loadBalancer: serviceConfig.loadBalancer || {},
                    rateLimit: serviceConfig.rateLimit || {},
                    status: serviceConfig.status || 'active'
                });
                logger.info(`Service '${serviceConfig.name}' updated`, { serviceId: service.id });
            }

            // Register instances
            if (serviceConfig.instances && serviceConfig.instances.length > 0) {
                // Remove existing instances
                await ServiceInstance.destroy({
                    where: { serviceId: service.id }
                });

                // Create new instances
                for (let i = 0; i < serviceConfig.instances.length; i++) {
                    const instanceConfig = serviceConfig.instances[i];
                    await ServiceInstance.create({
                        serviceId: service.id,
                        host: instanceConfig.host,
                        port: instanceConfig.port,
                        weight: instanceConfig.weight || 1,
                        region: instanceConfig.region || 'default',
                        metadata: instanceConfig.metadata || {},
                        status: 'active',
                        isHealthy: true
                    });
                }
                logger.info(`${serviceConfig.instances.length} instances registered for service '${serviceConfig.name}'`);
                
                // Sync instances to Redis for load balancing
                const redisInstances = serviceConfig.instances.map((instance, index) => ({
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
};
