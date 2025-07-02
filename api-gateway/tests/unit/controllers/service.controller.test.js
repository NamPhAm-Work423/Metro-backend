const serviceController = require('../../../src/controllers/service.controller');
const serviceService = require('../../../src/services/service.service');

// Mock service service
jest.mock('../../../src/services/service.service');

// Mock async error handler
jest.mock('../../../src/helpers/errorHandler.helper', () => {
  return jest.fn().mockImplementation((fn) => fn);
});

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('Service Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('findServiceById', () => {
    it('should find service by ID successfully', async () => {
      const mockService = { id: '1', name: 'test-service', endPoint: 'test' };
      req.params.id = '1';
      serviceService.findServiceById.mockResolvedValue(mockService);

      await serviceController.findServiceById(req, res, next);

      expect(serviceService.findServiceById).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'success',
        data: mockService
      });
    });
  });

  describe('findServiceByName', () => {
    it('should find service by name successfully', async () => {
      const mockService = { id: '1', name: 'test-service', endPoint: 'test' };
      req.params.name = 'test-service';
      serviceService.findServiceByName.mockResolvedValue(mockService);

      await serviceController.findServiceByName(req, res, next);

      expect(serviceService.findServiceByName).toHaveBeenCalledWith('test-service');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'success',
        data: mockService
      });
    });
  });

  describe('findServiceByEndPoint', () => {
    it('should find service by endpoint successfully', async () => {
      const mockService = { id: '1', name: 'test-service', endPoint: 'test' };
      req.params.endPoint = 'test';
      serviceService.findServiceByEndPoint.mockResolvedValue(mockService);

      await serviceController.findServiceByEndPoint(req, res, next);

      expect(serviceService.findServiceByEndPoint).toHaveBeenCalledWith('test');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'success',
        data: mockService
      });
    });
  });

  describe('createService', () => {
    it('should create service successfully', async () => {
      const mockService = { id: '1', name: 'new-service', endPoint: 'new' };
      req.body = { name: 'new-service', endPoint: 'new' };
      serviceService.createService.mockResolvedValue(mockService);

      await serviceController.createService(req, res, next);

      expect(serviceService.createService).toHaveBeenCalledWith('new-service', 'new');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'success',
        data: mockService
      });
    });
  });

  describe('deleteService', () => {
    it('should delete service successfully', async () => {
      const mockService = { id: '1', name: 'test-service' };
      req.params.name = 'test-service';
      serviceService.deleteService.mockResolvedValue(mockService);

      await serviceController.deleteService(req, res, next);

      expect(serviceService.deleteService).toHaveBeenCalledWith('test-service');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'success',
        data: mockService
      });
    });
  });

  describe('getAllService', () => {
    it('should get all services successfully', async () => {
      const mockServices = [
        { id: '1', name: 'service1' },
        { id: '2', name: 'service2' }
      ];
      serviceService.getAllService.mockResolvedValue(mockServices);

      await serviceController.getAllService(req, res, next);

      expect(serviceService.getAllService).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'success',
        data: mockServices
      });
    });
  });

  describe('getServiceById', () => {
    it('should get service by ID successfully', async () => {
      const mockService = { id: '1', name: 'test-service' };
      req.params.serviceId = '1';
      serviceService.findServiceById.mockResolvedValue(mockService);

      await serviceController.getServiceById(req, res, next);

      expect(serviceService.findServiceById).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockService
      });
    });

    it('should return 404 when service not found', async () => {
      req.params.serviceId = '999';
      serviceService.findServiceById.mockResolvedValue(null);

      await serviceController.getServiceById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service not found'
      });
    });
  });

  describe('getServiceInstances', () => {
    it('should get service instances successfully', async () => {
      const mockInstances = [
        { id: '1', host: 'localhost', port: 3001 },
        { id: '2', host: 'localhost', port: 3002 }
      ];
      req.params.serviceId = '1';
      serviceService.findInstancesByServiceId.mockResolvedValue(mockInstances);

      await serviceController.getServiceInstances(req, res, next);

      expect(serviceService.findInstancesByServiceId).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockInstances
      });
    });
  });

  describe('createNewInstance', () => {
    it('should create new instance successfully', async () => {
      const mockInstance = { id: '1', host: 'localhost', port: 3001 };
      req.body = { id: 'service-1', host: 'localhost', port: 3001 };
      serviceService.createNewInstance.mockResolvedValue(mockInstance);

      await serviceController.createNewInstance(req, res, next);

      expect(serviceService.createNewInstance).toHaveBeenCalledWith('service-1', 'localhost', 3001);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'success',
        data: mockInstance
      });
    });
  });

  describe('deleteInstance', () => {
    it('should delete instance successfully', async () => {
      const mockInstance = { id: '1' };
      req.params.id = '1';
      serviceService.deleteInstance.mockResolvedValue(mockInstance);

      await serviceController.deleteInstance(req, res, next);

      expect(serviceService.deleteInstance).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'success',
        data: mockInstance
      });
    });
  });

  describe('createBulkInstances', () => {
    it('should create bulk instances successfully', async () => {
      const instances = [
        { host: 'localhost', port: 3001 },
        { host: 'localhost', port: 3002 }
      ];
      const mockCreatedInstances = [
        { id: '1', host: 'localhost', port: 3001 },
        { id: '2', host: 'localhost', port: 3002 }
      ];
      req.body = { instances };
      serviceService.createBulkInstances.mockResolvedValue(mockCreatedInstances);

      await serviceController.createBulkInstances(req, res, next);

      expect(serviceService.createBulkInstances).toHaveBeenCalledWith(instances);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'success',
        data: mockCreatedInstances
      });
    });
  });

  describe('createNewService', () => {
    it('should create new service with instances successfully', async () => {
      const mockService = { id: '1', name: 'new-service', endPoint: 'new' };
      const instances = [{ host: 'localhost', port: 3001 }];
      req.body = { name: 'new-service', endPoint: 'new', instances };
      serviceService.createNewService.mockResolvedValue(mockService);

      await serviceController.createNewService(req, res, next);

      expect(serviceService.createNewService).toHaveBeenCalledWith('new-service', 'new', instances);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'success',
        data: mockService
      });
    });
  });
}); 