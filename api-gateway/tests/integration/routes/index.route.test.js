const express = require('express');
const request = require('supertest');

// Mock dependencies before requiring routes to prevent heavy imports
jest.mock('../../../src/middlewares/auth.middleware', () => ({
  authenticate: (req, res, next) => next(),
  authorize: () => (req, res, next) => next(),
}));

jest.mock('../../../src/controllers/user.controller', () => {
  const noop = () => (req, res) => res.end();
  return {
    signup: noop(),
    login: noop(),
    logout: noop(),
    refreshToken: noop(),
    verifyEmail: noop(),
    verifyToken: noop(),
    getMe: noop(),
    forgotPassword: noop(),
    resetPassword: noop(),
  };
});

jest.mock('../../../src/controllers/service.controller', () => {
  const noop = (req, res) => res.end();
  return {
    registerService: noop,
    getAllServices: noop,
    getServiceByName: noop,
    updateService: noop,
    registerInstance: noop,
    removeInstance: noop,
    healthCheck: noop,
    getNextInstance: noop,
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