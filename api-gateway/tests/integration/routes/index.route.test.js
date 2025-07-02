const express = require('express');
const request = require('supertest');

// Mock dependencies before requiring routes to prevent heavy imports
jest.mock('../../../src/middlewares/auth.middleware', () => ({
  authenticate: (req, res, next) => next(),
  authorize: () => (req, res, next) => next(),
}));

jest.mock('../../../src/controllers/user.controller', () => {
  const noop = () => (req, res) => res.status(200).json({ success: true });
  return {
    signup: noop(),
    login: noop(),
    logout: noop(),
    refreshToken: noop(),
    verifyEmail: noop(),
    verifyEmailFromQuery: noop(),
    verifyToken: noop(),
    getMe: noop(),
    forgotPassword: noop(),
    resetPassword: noop(),
    unlockAccount: noop(),
  };
});

jest.mock('../../../src/controllers/service.controller', () => {
  const noop = (req, res) => res.status(200).json({ success: true });
  return {
    getAllService: noop,
    createService: noop,
    getServiceById: noop,
    updateService: noop,
    deleteService: noop,
    getServiceInstances: noop,
    createNewInstance: noop,
    getInstanceById: noop,
    updateInstance: noop,
    deleteInstance: noop,
    // Legacy functions for compatibility
    registerService: noop,
    getAllServices: noop,
    getServiceByName: noop,
    registerInstance: noop,
    removeInstance: noop,
    healthCheck: noop,
    getNextInstance: noop,
  };
});

// Mock auth controller for API key management
jest.mock('../../../src/controllers/auth.controller', () => {
  const noop = (req, res) => res.status(200).json({ success: true });
  return {
    generateAPIToken: noop,
    getAPIKeyByUser: noop,
    deleteKeyById: noop,
  };
});

jest.mock('../../../src', () => ({ jwt: { secret: 'test' } }));

const indexRoutes = require('../../../src/routes');

describe('Index Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/', indexRoutes);

  it('GET /health should return 200 with success true', async () => {
    const res = await request(app).get('/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api-docs should return 200', async () => {
    const res = await request(app).get('/api-docs');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
}); 