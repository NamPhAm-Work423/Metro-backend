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

// Mock authentication middleware to bypass authentication
jest.mock('../../../src/middlewares/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user', roles: ['admin'] };
    next();
  }
}));

// Mock routing controller methods so we can verify routing without actual service calls
jest.mock('../../../src/controllers/routing.controller', () => {
  const mockController = {
    useService: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Service routed successfully',
      data: { endpoint: req.params.endPoint, path: req.params[0] }
    })),
    checkServiceHealth: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Service is healthy',
      data: { endpoint: req.params.endPoint, healthy: true }
    }))
  };
  return mockController;
});

// Re-require mocked controller to access spies
const routingControllerMock = require('../../../src/controllers/routing.controller');

const routingRoutes = require('../../../src/routes/routing.route');

describe('Routing Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/v1/route', routingRoutes);

  afterEach(() => jest.clearAllMocks());

  describe('Dynamic Routing Tests', () => {
    it('should route exact endpoint match', async () => {
      const res = await request(app)
        .get('/v1/route/users')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(routingControllerMock.useService).toHaveBeenCalled();
      expect(res.body.success).toBe(true);
    });

    it('should route endpoint with additional path segments', async () => {
      const res = await request(app)
        .get('/v1/route/users/profile/settings')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(routingControllerMock.useService).toHaveBeenCalled();
      expect(res.body.success).toBe(true);
    });

    it('should handle POST requests to endpoints', async () => {
      const res = await request(app)
        .post('/v1/route/tickets')
        .set('Authorization', 'Bearer test')
        .send({ title: 'Test ticket' });

      expect(res.statusCode).toBe(200);
      expect(routingControllerMock.useService).toHaveBeenCalled();
    });

    it('should handle PUT requests to endpoints', async () => {
      const res = await request(app)
        .put('/v1/route/users/123')
        .set('Authorization', 'Bearer test')
        .send({ name: 'Updated User' });

      expect(res.statusCode).toBe(200);
      expect(routingControllerMock.useService).toHaveBeenCalled();
    });

    it('should handle DELETE requests to endpoints', async () => {
      const res = await request(app)
        .delete('/v1/route/tickets/456')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(routingControllerMock.useService).toHaveBeenCalled();
    });

    it('should handle complex nested paths', async () => {
      const res = await request(app)
        .get('/v1/route/transport/routes/123/stations')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(routingControllerMock.useService).toHaveBeenCalled();
    });

    it('should handle URL-encoded paths', async () => {
      const res = await request(app)
        .get('/v1/route/passengers%2Fme')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(routingControllerMock.useService).toHaveBeenCalled();
    });

    it('should support all HTTP methods (PATCH)', async () => {
      const res = await request(app)
        .patch('/v1/route/users/789')
        .set('Authorization', 'Bearer test')
        .send({ status: 'active' });

      expect(res.statusCode).toBe(200);
      expect(routingControllerMock.useService).toHaveBeenCalled();
    });
  });
}); 