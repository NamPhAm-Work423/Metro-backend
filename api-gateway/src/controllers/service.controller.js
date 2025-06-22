const serviceService = require('../services/service.service');
const logger = require('../config/logger');
const asyncErrorHandler = require('../helpers/errorHandler.helper');

const serviceController = {
    /**
     * @description Register a new service
     * @route POST /api/services
     */
    registerService: asyncErrorHandler(async (req, res) => {
        const serviceData = req.body;
        const service = await serviceService.registerService(serviceData);

        logger.info(`Service registered: ${service.name}`);
        res.status(201).json({
            success: true,
            message: 'Service registered successfully',
            data: service
        });
    }),

    /**
     * @description Get all services
     * @route GET /api/services
     */
    getAllServices: asyncErrorHandler(async (req, res) => {
        const services = await serviceService.getAllServices();

        res.json({
            success: true,
            data: services
        });
    }),

    /**
     * @description Get service by name
     * @route GET /api/services/:name
     */
    getServiceByName: asyncErrorHandler(async (req, res) => {
        const { name } = req.params;
        const service = await serviceService.getServiceByName(name);

        res.json({
            success: true,
            data: service
        });
    }),

    /**
     * @description Find service by endpoint (internal function)
     * @param {string} endPoint - Service endpoint
     * @returns {Promise<Object>} Service details
     */
    findServiceByEndPoint: async (endPoint) => {
        return await serviceService.getServiceByEndPoint(endPoint);
    },

    /**
     * @description Create new service (internal function)
     * @param {string} name - Service name
     * @param {string} endPoint - Service endpoint
     * @returns {Promise<Object>} Created service
     */
    create: async (name, endPoint) => {
        return await serviceService.registerService({ name, path: endPoint });
    },

    /**
     * @description Create bulk instances (internal function)
     * @param {Array} instances - Array of instances
     * @returns {Promise<Array>} Created instances
     */
    createBulkInstances: async (instances) => {
        const results = [];
        for (const instanceData of instances) {
            const instance = await serviceService.registerInstance(instanceData.ServiceId, instanceData);
            results.push(instance);
        }
        return results;
    },

    /**
     * @description Register a new service instance
     * @route POST /api/services/:serviceId/instances
     */
    registerInstance: asyncErrorHandler(async (req, res) => {
        const { serviceId } = req.params;
        const instanceData = req.body;

        const instance = await serviceService.registerInstance(serviceId, instanceData);

        logger.info(`Instance registered for service ${serviceId}: ${instance.host}:${instance.port}`);
        res.status(201).json({
            success: true,
            message: 'Service instance registered successfully',
            data: instance
        });
    }),

    /**
     * @description Perform health check on service instances
     * @route GET /api/services/:serviceId/health
     */
    healthCheck: asyncErrorHandler(async (req, res) => {
        const { serviceId } = req.params;
        const results = await serviceService.healthCheck(serviceId);

        res.json({
            success: true,
            data: results
        });
    }),

    /**
     * @description Update service configuration
     * @route PUT /api/services/:serviceId
     */
    updateService: asyncErrorHandler(async (req, res) => {
        const { serviceId } = req.params;
        const updates = req.body;

        const service = await serviceService.updateService(serviceId, updates);

        logger.info(`Service updated: ${service.name}`);
        res.json({
            success: true,
            message: 'Service updated successfully',
            data: service
        });
    }),

    /**
     * @description Remove service instance
     * @route DELETE /api/services/:serviceId/instances/:instanceId
     */
    removeInstance: asyncErrorHandler(async (req, res) => {
        const { instanceId } = req.params;

        await serviceService.removeInstance(instanceId);

        logger.info(`Instance removed: ${instanceId}`);
        res.json({
            success: true,
            message: 'Service instance removed successfully'
        });
    }),

    /**
     * @description Get next available instance for load balancing
     * @route GET /api/services/:serviceId/next-instance
     */
    getNextInstance: asyncErrorHandler(async (req, res) => {
        const { serviceId } = req.params;
        const instance = await serviceService.getNextInstance(serviceId);

        res.json({
            success: true,
            data: instance
        });
    })
};

module.exports = serviceController;
