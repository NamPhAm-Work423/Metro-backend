const serviceService = require('../services/service.service');
const logger = require('../config/logger');
const asyncErrorHandler = require('../helpers/errorHandler.helper');

const serviceController = {
    findServiceById: asyncErrorHandler(async (req, res, next) => {
        const service = await serviceService.findServiceById(req.params.id);
        res.status(200).json({ message: 'success', data: service });
    }),
    findServiceByName: asyncErrorHandler(async (req, res, next) => {
        const service = await serviceService.findServiceByName(req.params.name);
        res.status(200).json({ message: 'success', data: service });
    }),
    findServiceByEndPoint: asyncErrorHandler(async (req, res, next) => {
        const service = await serviceService.findServiceByEndPoint(req.params.endPoint);
        res.status(200).json({ message: 'success', data: service });
    }),
    findServiceInstanceEndPoint: asyncErrorHandler(async (req, res, next) => {
        const serviceInstance = await serviceService.findServiceInstanceEndPoint(req.params.endPoint);
        res.status(200).json({ message: 'success', data: serviceInstance });
    }),
    findInstancesByServiceId: asyncErrorHandler(async (req, res, next) => {
        const instances = await serviceService.findInstancesByServiceId(req.params.serviceId);
        res.status(200).json({ message: 'success', data: instances });
    }),
    createService: asyncErrorHandler(async (req, res, next) => {
        const service = await serviceService.createService(req.body.name, req.body.endPoint);
        res.status(200).json({ message: 'success', data: service });
    }),
    createBulkInstances: asyncErrorHandler(async (req, res, next) => {
        const instances = await serviceService.createBulkInstances(req.body.instances);
        res.status(200).json({ message: 'success', data: instances });
    }),
    deleteService: asyncErrorHandler(async (req, res, next) => {
        const service = await serviceService.deleteService(req.params.name);
        res.status(200).json({ message: 'success', data: service });
    }),
    createNewService: asyncErrorHandler(async (req, res, next) => {
        const service = await serviceService.createNewService(req.body.name, req.body.endPoint, req.body.instances);
        res.status(200).json({ message: 'success', data: service });
    }),
    createNewInstance: asyncErrorHandler(async (req, res, next) => {
        const instance = await serviceService.createNewInstance(req.body.id, req.body.host, req.body.port);
        res.status(200).json({ message: 'success', data: instance });
    }),
    deleteInstance: asyncErrorHandler(async (req, res, next) => {
        const instance = await serviceService.deleteInstance(req.params.id);
        res.status(200).json({ message: 'success', data: instance });
    }),
    getAllService: asyncErrorHandler(async (req, res, next) => {
        const services = await serviceService.getAllService();
        res.status(200).json({ message: 'success', data: services });
    }),
    getServiceByName: asyncErrorHandler(async (req, res, next) => {
        const service = await serviceService.getServiceByName(req.params.name);
        res.status(200).json({ message: 'success', data: service });
    }),
};

module.exports = serviceController;
