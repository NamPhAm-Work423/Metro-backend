const express = require('express');
const request = require('supertest');

// Mock authentication & authorisation middleware to always allow
jest.mock('../../../src/middlewares/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user', roles: ['admin'] };
    next();
  },
  authorize: () => (req, res, next) => next(),
}));

// Mock service controller methods so we can verify routing without touching database
jest.mock('../../../src/controllers/service.controller', () => {
  const mockController = {
    registerService: jest.fn((req, res) => res.status(201).json({ success: true })),
    getAllServices: jest.fn((req, res) => res.status(200).json({ success: true, data: [] })),
    getServiceByName: jest.fn((req, res) => res.status(200).json({ success: true, data: { name: 'sample' } })),
    updateService: jest.fn((req, res) => res.status(200).json({ success: true })),
    registerInstance: jest.fn((req, res) => res.status(201).json({ success: true })),
    removeInstance: jest.fn((req, res) => res.status(200).json({ success: true })),
    healthCheck: jest.fn((req, res) => res.status(200).json({ success: true, data: [] })),
    getNextInstance: jest.fn((req, res) => res.status(200).json({ success: true, data: {} })),
  };
  return mockController;
});

// Re-require mocked controller to access spies
const serviceControllerMock = require('../../../src/controllers/service.controller');

const serviceRoutes = require('../../../src/routes/service.routes');

describe('Service Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/services', serviceRoutes);

  afterEach(() => jest.clearAllMocks());

  it('GET /api/services should return 200', async () => {
    const res = await request(app)
      .get('/api/services')
      .set('Authorization', 'Bearer test');

    expect(res.statusCode).toBe(200);
    expect(serviceControllerMock.getAllServices).toHaveBeenCalled();
  });

  it('POST /api/services should return 201', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', 'Bearer test')
      .send({ name: 'sample', path: '/api/sample', version: '1.0.0' });

    expect(res.statusCode).toBe(201);
    expect(serviceControllerMock.registerService).toHaveBeenCalled();
  });

  it('GET /api/services/:name should return 200', async () => {
    const res = await request(app)
      .get('/api/services/sample')
      .set('Authorization', 'Bearer test');

    expect(res.statusCode).toBe(200);
    expect(serviceControllerMock.getServiceByName).toHaveBeenCalled();
  });
}); 