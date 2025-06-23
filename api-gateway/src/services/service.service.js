const Service = require('../models/service.model');
const ServiceInstance = require('../models/serviceInstance.model');
const redis = require('../config/redis');
const config = require('..');
const { logger } = require('../config/logger');
const axios = require('axios');

require('dotenv').config();

class ServiceService {
    /**
     * @description Register a new service
     * @param {Object} serviceData - Service registration data
     * @returns {Promise<Object>} Registered service
     */
    async registerService(serviceData) {
        try {
            const { name, path, instances, timeout, retries, circuitBreaker, loadBalancer, authentication, rateLimit } = serviceData;

            // Check if service already exists
            const existingService = await Service.findOne({ where: { name } });
            if (existingService) {
                throw new Error(`Service ${name} already exists`);
            }

            // Create service
            const service = await Service.create({
                name,
                path,
                timeout: timeout || 30000,
                retries: retries || 3,
                circuitBreaker: circuitBreaker || {
                    enabled: true,
                    threshold: 5,
                    timeout: 60000,
                    monitoringPeriod: 10000
                },
                loadBalancer: loadBalancer || {
                    strategy: 'round-robin'
                },
                authentication: authentication || {
                    required: false,
                    roles: []
                },
                rateLimit: rateLimit || {
                    enabled: true,
                    requests: 100,
                    windowMs: 60000
                }
            });

            // Register service instances
            if (instances && instances.length > 0) {
                await Promise.all(instances.map(instance => 
                    this.registerInstance(service.id, instance)
                ));
            }

            logger.info(`Service ${name} registered successfully`);
            return service;
        } catch (error) {
            logger.error(`Error registering service: ${error.message}`);
            throw error;
        }
    }

    /**
     * @description Register a new service instance
     * @param {string} serviceId - Service ID
     * @param {Object} instanceData - Instance data
     * @returns {Promise<Object>} Registered instance
     */
    async registerInstance(serviceId, instanceData) {
        try {
            const { host, port, weight = 1 } = instanceData;

            // Check if instance already exists
            const existingInstance = await ServiceInstance.findOne({
                where: { serviceId, host, port }
            });

            if (existingInstance) {
                throw new Error(`Instance ${host}:${port} already exists for this service`);
            }

            // Create instance
            const instance = await ServiceInstance.create({
                serviceId,
                host,
                port,
                weight,
                status: 'active',
                lastHealthCheck: new Date()
            });

            // Cache instance for quick lookup
            await this.cacheInstance(instance);

            logger.info(`Instance ${host}:${port} registered for service ${serviceId}`);
            return instance;
        } catch (error) {
            logger.error(`Error registering instance: ${error.message}`);
            throw error;
        }
    }

    /**
     * @description Get all registered services
     * @returns {Promise<Array>} List of services
     */
    async getAllServices() {
        try {
            const services = await Service.findAll({
                include: [{
                    model: ServiceInstance,
                    as: 'instances',
                    where: { status: 'active' },
                    required: false
                }]
            });

            return services;
        } catch (error) {
            logger.error(`Error getting services: ${error.message}`);
            throw error;
        }
    }

    /**
     * @description Get service by endpoint
     * @param {string} endPoint - Service endpoint
     * @returns {Promise<Object>} Service details
     */
    async getServiceByEndPoint(endPoint) {
        try {
            const service = await Service.findOne({
                where: { path: endPoint },
                include: [{
                    model: ServiceInstance,
                    as: 'instances',
                    where: { status: 'active' },
                    required: false
                }]
            });

            return service; // Return null if not found
        } catch (error) {
            logger.error(`Error getting service by endpoint ${endPoint}: ${error.message}`);
            throw error;
        }
    }

    /**
     * @description Get service by name
     * @param {string} name - Service name
     * @returns {Promise<Object>} Service details
     */
    async getServiceByName(name) {
        try {
            const service = await Service.findOne({
                where: { name },
                include: [{
                    model: ServiceInstance,
                    as: 'instances',
                    where: { status: 'active' },
                    required: false
                }]
            });

            if (!service) {
                throw new Error(`Service ${name} not found`);
            }

            return service;
        } catch (error) {
            logger.error(`Error getting service ${name}: ${error.message}`);
            throw error;
        }
    }

    /**
     * @description Perform health check on service instances
     * @param {string} serviceId - Service ID
     * @returns {Promise<Array>} Health check results
     */
    async healthCheck(serviceId) {
        try {
            const instances = await ServiceInstance.findAll({
                where: { serviceId }
            });

            const results = await Promise.all(instances.map(async (instance) => {
                try {
                    const healthUrl = `http://${instance.host}:${instance.port}/health`;
                    const response = await axios.get(healthUrl, { timeout: 5000 });

                    // Update instance status
                    await instance.update({
                        status: 'active',
                        lastHealthCheck: new Date()
                    });

                    return {
                        instance,
                        status: 'healthy',
                        response: response.data
                    };
                } catch (error) {
                    // Update instance status
                    await instance.update({
                        status: 'unhealthy',
                        lastHealthCheck: new Date()
                    });

                    return {
                        instance,
                        status: 'unhealthy',
                        error: error.message
                    };
                }
            }));

            return results;
        } catch (error) {
            logger.error(`Error performing health check: ${error.message}`);
            throw error;
        }
    }

    /**
     * @description Get next available instance for load balancing
     * @param {string} serviceId - Service ID
     * @returns {Promise<Object>} Selected instance
     */
    async getNextInstance(serviceId) {
        try {
            // Try to get from cache first
            const cachedInstance = await this.getCachedInstance(serviceId);
            if (cachedInstance) {
                return cachedInstance;
            }

            // Get all active instances
            const instances = await ServiceInstance.findAll({
                where: { serviceId, status: 'active' }
            });

            if (!instances.length) {
                throw new Error(`No active instances found for service ${serviceId}`);
            }

            // Get service to determine load balancing strategy
            const service = await Service.findByPk(serviceId);
            const strategy = service.loadBalancer.strategy;

            let selectedInstance;
            switch (strategy) {
                case 'round-robin':
                    selectedInstance = this.roundRobin(instances);
                    break;
                case 'weighted':
                    selectedInstance = this.weightedRoundRobin(instances);
                    break;
                default:
                    selectedInstance = this.roundRobin(instances);
            }

            // Cache the selected instance
            await this.cacheInstance(selectedInstance);

            return selectedInstance;
        } catch (error) {
            logger.error(`Error getting next instance: ${error.message}`);
            throw error;
        }
    }

    /**
     * @description Simple round-robin load balancing
     * @param {Array} instances - List of instances
     * @returns {Object} Selected instance
     */
    roundRobin(instances) {
        const index = Math.floor(Math.random() * instances.length);
        return instances[index];
    }

    /**
     * @description Weighted round-robin load balancing
     * @param {Array} instances - List of instances
     * @returns {Object} Selected instance
     */
    weightedRoundRobin(instances) {
        const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
        let random = Math.random() * totalWeight;

        for (const instance of instances) {
            random -= instance.weight;
            if (random <= 0) {
                return instance;
            }
        }

        return instances[0];
    }

    /**
     * @description Cache service instance
     * @param {Object} instance - Service instance
     * @returns {Promise<void>}
     */
    async cacheInstance(instance) {
        try {
            const key = `service:${instance.serviceId}:instance`;
            await redis.setWithExpiry(key, JSON.stringify(instance), 300); // Cache for 5 minutes
        } catch (error) {
            logger.error(`Error caching instance: ${error.message}`);
        }
    }

    /**
     * @description Get cached service instance
     * @param {string} serviceId - Service ID
     * @returns {Promise<Object>} Cached instance
     */
    async getCachedInstance(serviceId) {
        try {
            const key = `service:${serviceId}:instance`;
            const cached = await redis.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            logger.error(`Error getting cached instance: ${error.message}`);
            return null;
        }
    }

    /**
     * @description Update service configuration
     * @param {string} serviceId - Service ID
     * @param {Object} updates - Update data
     * @returns {Promise<Object>} Updated service
     */
    async updateService(serviceId, updates) {
        try {
            const service = await Service.findByPk(serviceId);
            if (!service) {
                throw new Error(`Service ${serviceId} not found`);
            }

            await service.update(updates);
            logger.info(`Service ${serviceId} updated successfully`);
            return service;
        } catch (error) {
            logger.error(`Error updating service: ${error.message}`);
            throw error;
        }
    }

    /**
     * @description Remove service instance
     * @param {string} instanceId - Instance ID
     * @returns {Promise<void>}
     */
    async removeInstance(instanceId) {
        try {
            const instance = await ServiceInstance.findByPk(instanceId);
            if (!instance) {
                throw new Error(`Instance ${instanceId} not found`);
            }

            await instance.destroy();
            logger.info(`Instance ${instanceId} removed successfully`);
        } catch (error) {
            logger.error(`Error removing instance: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new ServiceService();

