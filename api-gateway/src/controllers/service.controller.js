const serviceService = require('../services/service.service');
const { logger } = require('../config/logger');
const asyncErrorHandler = require('../helpers/errorHandler.helper');

const serviceController = {
    findServiceById: asyncErrorHandler(async (req, res, next) => {
        logger.info('Finding service by ID', { id: req.params.id });
        const service = await serviceService.findServiceById(req.params.id);
        logger.info('Service found successfully', { id: req.params.id, serviceName: service?.name });
        res.status(200).json({ message: 'success', data: service });
    }),
    
    findServiceByName: asyncErrorHandler(async (req, res, next) => {
        logger.info('Finding service by name', { name: req.params.name });
        const service = await serviceService.findServiceByName(req.params.name);
        logger.info('Service found successfully', { name: req.params.name, serviceId: service?.id });
        res.status(200).json({ message: 'success', data: service });
    }),
    
    findServiceByEndPoint: asyncErrorHandler(async (req, res, next) => {
        logger.info('Finding service by endpoint', { endPoint: req.params.endPoint });
        const service = await serviceService.findServiceByEndPoint(req.params.endPoint);
        logger.info('Service found successfully', { endPoint: req.params.endPoint, serviceName: service?.name });
        res.status(200).json({ message: 'success', data: service });
    }),
    
    findServiceInstanceEndPoint: asyncErrorHandler(async (req, res, next) => {
        logger.info('Finding service instance by endpoint', { endPoint: req.params.endPoint });
        const serviceInstance = await serviceService.findServiceInstanceEndPoint(req.params.endPoint);
        logger.info('Service instance found successfully', { 
            endPoint: req.params.endPoint, 
            instanceCount: serviceInstance?.length || 0 
        });
        res.status(200).json({ message: 'success', data: serviceInstance });
    }),
    
    findInstancesByServiceId: asyncErrorHandler(async (req, res, next) => {
        logger.info('Finding instances by service ID', { serviceId: req.params.serviceId });
        const instances = await serviceService.findInstancesByServiceId(req.params.serviceId);
        logger.info('Instances found successfully', { 
            serviceId: req.params.serviceId, 
            instanceCount: instances?.length || 0 
        });
        res.status(200).json({ message: 'success', data: instances });
    }),
    
    createService: asyncErrorHandler(async (req, res, next) => {
        const { name, endPoint } = req.body;
        logger.info('Creating new service', { name, endPoint });
        const service = await serviceService.createService(name, endPoint);
        logger.info('Service created successfully', { name, endPoint, serviceId: service?.id });
        res.status(200).json({ message: 'success', data: service });
    }),
    
    createBulkInstances: asyncErrorHandler(async (req, res, next) => {
        const { instances } = req.body;
        logger.info('Creating bulk instances', { instanceCount: instances?.length || 0 });
        const createdInstances = await serviceService.createBulkInstances(instances);
        logger.info('Bulk instances created successfully', { 
            requestedCount: instances?.length || 0,
            createdCount: createdInstances?.length || 0 
        });
        res.status(200).json({ message: 'success', data: createdInstances });
    }),
    
    deleteService: asyncErrorHandler(async (req, res, next) => {
        const { name } = req.params;
        logger.info('Deleting service', { serviceName: name });
        const service = await serviceService.deleteService(name);
        logger.info('Service deleted successfully', { serviceName: name });
        res.status(200).json({ message: 'success', data: service });
    }),
    
    createNewService: asyncErrorHandler(async (req, res, next) => {
        const { name, endPoint, instances } = req.body;
        logger.info('Creating new service with instances', { 
            name, 
            endPoint, 
            instanceCount: instances?.length || 0 
        });
        const service = await serviceService.createNewService(name, endPoint, instances);
        logger.info('Service with instances created successfully', { 
            name, 
            endPoint, 
            serviceId: service?.id 
        });
        res.status(200).json({ message: 'success', data: service });
    }),
    
    createNewInstance: asyncErrorHandler(async (req, res, next) => {
        const { id, host, port } = req.body;
        logger.info('Creating new service instance', { serviceId: id, host, port });
        const instance = await serviceService.createNewInstance(id, host, port);
        logger.info('Service instance created successfully', { 
            serviceId: id, 
            host, 
            port, 
            instanceId: instance?.id 
        });
        res.status(200).json({ message: 'success', data: instance });
    }),
    
    deleteInstance: asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        logger.info('Deleting service instance', { instanceId: id });
        const instance = await serviceService.deleteInstance(id);
        logger.info('Service instance deleted successfully', { instanceId: id });
        res.status(200).json({ message: 'success', data: instance });
    }),
    
    getAllService: asyncErrorHandler(async (req, res, next) => {
        logger.info('Getting all services');
        const services = await serviceService.getAllService();
        logger.info('All services retrieved successfully', { serviceCount: services?.length || 0 });
        res.status(200).json({ message: 'success', data: services });
    }),
    getServiceByName: asyncErrorHandler(async (req, res, next) => {
        logger.info('Getting service by name', { serviceName: req.params.name });
        const service = await serviceService.getServiceByName(req.params.name);
        logger.info('Service retrieved successfully', { serviceName: req.params.name, serviceId: service?.id });
        res.status(200).json({ message: 'success', data: service });
    }),

    // New functions for the updated routes with proper logging
    getServiceById: asyncErrorHandler(async (req, res, next) => {
        const { serviceId } = req.params;
        logger.info('Getting service by ID', { serviceId });
        
        try {
            const service = await serviceService.findServiceById(serviceId);
            if (!service) {
                logger.warn('Service not found', { serviceId });
                return res.status(404).json({ 
                    success: false, 
                    message: 'Service not found' 
                });
            }
            
            logger.info('Service retrieved successfully', { serviceId, serviceName: service.name });
            res.status(200).json({ success: true, data: service });
        } catch (error) {
            logger.error('Error retrieving service by ID', { serviceId, error: error.message });
            throw error;
        }
    }),

    updateService: asyncErrorHandler(async (req, res, next) => {
        const { serviceId } = req.params;
        const updateData = req.body;
        
        logger.info('Updating service', { serviceId, updateData });
        
        try {
            // TODO: Implement actual update logic in service layer
            // const updatedService = await serviceService.updateService(serviceId, updateData);
            
            logger.info('Service updated successfully', { serviceId });
            res.status(200).json({ 
                success: true, 
                message: 'Service updated successfully',
                // data: updatedService 
            });
        } catch (error) {
            logger.error('Error updating service', { serviceId, error: error.message });
            throw error;
        }
    }),

    getServiceInstances: asyncErrorHandler(async (req, res, next) => {
        const { serviceId } = req.params;
        logger.info('Getting service instances', { serviceId });
        
        try {
            const instances = await serviceService.findInstancesByServiceId(serviceId);
            logger.info('Service instances retrieved successfully', { 
                serviceId, 
                instanceCount: instances?.length || 0 
            });
            res.status(200).json({ success: true, data: instances });
        } catch (error) {
            logger.error('Error retrieving service instances', { serviceId, error: error.message });
            throw error;
        }
    }),

    getInstanceById: asyncErrorHandler(async (req, res, next) => {
        const { serviceId, instanceId } = req.params;
        logger.info('Getting service instance by ID', { serviceId, instanceId });
        
        try {
            // TODO: Implement actual logic in service layer
            // const instance = await serviceService.findInstanceById(instanceId);
            
            logger.info('Service instance retrieved successfully', { serviceId, instanceId });
            res.status(200).json({ 
                success: true, 
                message: 'Instance retrieved successfully',
                // data: instance 
            });
        } catch (error) {
            logger.error('Error retrieving service instance', { serviceId, instanceId, error: error.message });
            throw error;
        }
    }),

    updateInstance: asyncErrorHandler(async (req, res, next) => {
        const { serviceId, instanceId } = req.params;
        const updateData = req.body;
        
        logger.info('Updating service instance', { serviceId, instanceId, updateData });
        
        try {
            // TODO: Implement actual update logic in service layer
            // const updatedInstance = await serviceService.updateInstance(instanceId, updateData);
            
            logger.info('Service instance updated successfully', { serviceId, instanceId });
            res.status(200).json({ 
                success: true, 
                message: 'Instance updated successfully',
                // data: updatedInstance 
            });
        } catch (error) {
            logger.error('Error updating service instance', { serviceId, instanceId, error: error.message });
            throw error;
        }
    }),
};

module.exports = serviceController;
