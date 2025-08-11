const express = require('express');
const request = require('supertest');

// Mock all dependencies before importing anything
jest.mock('../../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock rate limiter
jest.mock('../../../src/middlewares/rateLimiter', () => ({
  apiRateLimiter: (req, res, next) => next(),
  burstProtection: (req, res, next) => next(),
  defaultRateLimiter: (req, res, next) => next(),
  authRateLimiter: (req, res, next) => next(),
  sensitiveRateLimiter: (req, res, next) => next()
}));

// Mock database and other dependencies
jest.mock('../../../src/config/database', () => {
  const { Sequelize } = require('sequelize');
  return new Sequelize('sqlite::memory:', { logging: false });
});

// Remove unused mocks for non-existent gateway modules

// Mock service controller BEFORE requiring routes
const mockServiceController = {
  getAllService: jest.fn((req, res) => res.status(200).json({ success: true, data: [] })),
  createService: jest.fn((req, res) => res.status(201).json({ success: true, data: { id: 1, name: 'test' } })),
  getServiceById: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: 1 } })),
  updateService: jest.fn((req, res) => res.status(200).json({ success: true, message: 'Updated' } )),
  deleteService: jest.fn((req, res) => res.status(200).json({ success: true, message: 'Deleted' } )),
  getServiceInstances: jest.fn((req, res) => res.status(200).json({ success: true, data: [] })),
  createNewInstance: jest.fn((req, res) => res.status(201).json({ success: true, data: { id: 1 } })),
  getInstanceById: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: 1 } })),
  updateInstance: jest.fn((req, res) => res.status(200).json({ success: true, message: 'Updated' } )),
  deleteInstance: jest.fn((req, res) => res.status(200).json({ success: true, message: 'Deleted' } ))
};

// Mock auth middleware
const mockAuthMiddleware = {
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 1, role: 'admin' };
    next();
  })
};

// Apply mocks before requiring modules
jest.mock('../../../src/controllers/service.controller', () => mockServiceController);
jest.mock('../../../src/middlewares/auth.middleware', () => mockAuthMiddleware);

// Now require the routes after mocking
const serviceRoutes = require('../../../src/routes/service.route');

describe('Service Routes Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/services', serviceRoutes);

    // Clear all mocks
    Object.values(mockServiceController).forEach(fn => fn.mockClear());
    mockAuthMiddleware.authenticate.mockClear();
  });

  describe('GET /api/services', () => {
    it('should get all services', async () => {
      const res = await request(app)
        .get('/api/services')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockServiceController.getAllService).toHaveBeenCalledTimes(1);
      expect(mockAuthMiddleware.authenticate).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/services', () => {
    it('should create a new service', async () => {
      const serviceData = { name: 'test-service', endpoint: '/test' };

      const res = await request(app)
        .post('/api/services')
        .send(serviceData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(mockServiceController.createService).toHaveBeenCalledTimes(1);
      expect(mockAuthMiddleware.authenticate).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/services/:serviceId', () => {
    it('should get service by ID', async () => {
      const res = await request(app)
        .get('/api/services/123')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockServiceController.getServiceById).toHaveBeenCalledTimes(1);
      expect(mockAuthMiddleware.authenticate).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /api/services/:serviceId', () => {
    it('should update service', async () => {
      const updateData = { name: 'updated-service' };

      const res = await request(app)
        .put('/api/services/123')
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockServiceController.updateService).toHaveBeenCalledTimes(1);
      expect(mockAuthMiddleware.authenticate).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /api/services/:serviceId', () => {
    it('should delete service', async () => {
      const res = await request(app)
        .delete('/api/services/123')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockServiceController.deleteService).toHaveBeenCalledTimes(1);
      expect(mockAuthMiddleware.authenticate).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/services/:serviceId/instances', () => {
    it('should get service instances', async () => {
      const res = await request(app)
        .get('/api/services/123/instances')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockServiceController.getServiceInstances).toHaveBeenCalledTimes(1);
      expect(mockAuthMiddleware.authenticate).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/services/:serviceId/instances', () => {
    it('should create new instance', async () => {
      const instanceData = { host: 'localhost', port: 3000 };

      const res = await request(app)
        .post('/api/services/123/instances')
        .send(instanceData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(mockServiceController.createNewInstance).toHaveBeenCalledTimes(1);
      expect(mockAuthMiddleware.authenticate).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/services/:serviceId/instances/:instanceId', () => {
    it('should get instance by ID', async () => {
      const res = await request(app)
        .get('/api/services/123/instances/456')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockServiceController.getInstanceById).toHaveBeenCalledTimes(1);
      expect(mockAuthMiddleware.authenticate).toHaveBeenCalledTimes(1);
    });
  });

  describe('PUT /api/services/:serviceId/instances/:instanceId', () => {
    it('should update instance', async () => {
      const updateData = { host: 'newhost', port: 4000 };

      const res = await request(app)
        .put('/api/services/123/instances/456')
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockServiceController.updateInstance).toHaveBeenCalledTimes(1);
      expect(mockAuthMiddleware.authenticate).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /api/services/:serviceId/instances/:instanceId', () => {
    it('should delete instance', async () => {
      const res = await request(app)
        .delete('/api/services/123/instances/456')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockServiceController.deleteInstance).toHaveBeenCalledTimes(1);
      expect(mockAuthMiddleware.authenticate).toHaveBeenCalledTimes(1);
    });
  });
}); 