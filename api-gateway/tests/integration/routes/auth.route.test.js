const express = require('express');
const request = require('supertest');

// No user controller in gateway; this test validates gateway auth route constraints

// Mock auth middleware to bypass authentication when required
jest.mock('../../../src/middlewares/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user', roles: ['user'] };
    next();
  },
}));

// Mock rate limiter to avoid circular require into src/index
jest.mock('../../../src/middlewares/rateLimiter', () => ({
  apiRateLimiter: (req, res, next) => next(),
  burstProtection: (req, res, next) => next(),
  defaultRateLimiter: (req, res, next) => next(),
  authRateLimiter: (req, res, next) => next(),
  sensitiveRateLimiter: (req, res, next) => next()
}));

jest.mock('../../../src/controllers/routing.controller', () => ({
  useService: jest.fn((req, res) => res.status(200).json({
    success: true,
    endpoint: req.params.endPoint,
    path: req.params[0] || ''
  }))
}));

// Mock the parent src index required by middleware config
jest.mock('../../../src', () => ({ jwt: { secret: 'test' } }));

const authRoutes = require('../../../src/routes/auth.route');

describe('Gateway Auth Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/v1/auth', authRoutes);

  afterEach(() => jest.clearAllMocks());

  it('should allow only auth endpoint under /v1/auth', async () => {
    const res = await request(app).get('/v1/auth/auth/me');
    expect(res.statusCode).toBe(200);
    expect(res.body.endpoint).toBe('auth');
  });

  it('should block non-auth endpoints under /v1/auth', async () => {
    const res = await request(app).get('/v1/auth/user/me');
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.allowedEndpoints).toEqual(['auth']);
  });
}); 