const express = require('express');
const request = require('supertest');

// Mock user controller so we can test routing only
jest.mock('../../../src/controllers/user.controller', () => {
  const mockController = {
    signup: jest.fn((req, res) => res.status(201).json({ success: true })),
    login: jest.fn((req, res) => res.status(200).json({ success: true })),
    logout: jest.fn((req, res) => res.status(200).json({ success: true })),
    refreshToken: jest.fn((req, res) => res.status(200).json({ success: true })),
    verifyEmail: jest.fn((req, res) => res.status(200).json({ success: true })),
    verifyToken: jest.fn((req, res) => res.status(200).json({ success: true })),
    getMe: jest.fn((req, res) => res.status(200).json({ success: true })),
    forgotPassword: jest.fn((req, res) => res.status(200).json({ success: true })),
    resetPassword: jest.fn((req, res) => res.status(200).json({ success: true })),
  };
  return mockController;
});

// Re-require mocked controller
const userControllerMock = require('../../../src/controllers/user.controller');

// Mock auth middleware to bypass authentication when required
jest.mock('../../../src/middlewares/auth.middleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user', roles: ['user'] };
    next();
  },
}));

// Mock the parent src index required by middleware config
jest.mock('../../../src', () => ({ jwt: { secret: 'test' } }));

const authRoutes = require('../../../src/routes/auth.route');

describe('Auth Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/v1/auth', authRoutes);

  afterEach(() => jest.clearAllMocks());

  it('POST /v1/auth/register should return 201', async () => {
    const res = await request(app).post('/v1/auth/register').send({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(res.statusCode).toBe(201);
    expect(userControllerMock.signup).toHaveBeenCalled();
  });

  it('POST /v1/auth/login should return 200', async () => {
    const res = await request(app).post('/v1/auth/login').send({
      email: 'john@example.com',
      password: 'password123',
    });

    expect(res.statusCode).toBe(200);
    expect(userControllerMock.login).toHaveBeenCalled();
  });

  it('POST /v1/auth/logout should return 200', async () => {
    const res = await request(app)
      .post('/v1/auth/logout')
      .set('Authorization', 'Bearer token');

    expect(res.statusCode).toBe(200);
    expect(userControllerMock.logout).toHaveBeenCalled();
  });

  it('POST /v1/auth/refresh-token should return 200', async () => {
    const res = await request(app)
      .post('/v1/auth/refresh-token')
      .send({ refreshToken: 'refreshtoken' });

    expect(res.statusCode).toBe(200);
    expect(userControllerMock.refreshToken).toHaveBeenCalled();
  });

  it('GET /v1/auth/verify-email/:token should return 200', async () => {
    const res = await request(app).get('/v1/auth/verify-email/testtoken');

    expect(res.statusCode).toBe(200);
    expect(userControllerMock.verifyEmail).toHaveBeenCalled();
  });

  it('POST /v1/auth/verify-token should return 200', async () => {
    const res = await request(app)
      .post('/v1/auth/verify-token')
      .set('Authorization', 'Bearer token');

    expect(res.statusCode).toBe(200);
    expect(userControllerMock.verifyToken).toHaveBeenCalled();
  });

  it('GET /v1/auth/me should return 200', async () => {
    const res = await request(app)
      .get('/v1/auth/me')
      .set('Authorization', 'Bearer token');

    expect(res.statusCode).toBe(200);
    expect(userControllerMock.getMe).toHaveBeenCalled();
  });

  it('POST /v1/auth/forgot-password should return 200', async () => {
    const res = await request(app)
      .post('/v1/auth/forgot-password')
      .send({ email: 'john@example.com' });

    expect(res.statusCode).toBe(200);
    expect(userControllerMock.forgotPassword).toHaveBeenCalled();
  });

  it('POST /v1/auth/reset-password should return 200', async () => {
    const res = await request(app)
      .post('/v1/auth/reset-password')
      .send({ token: 'abc123', password: 'newPass123' });

    expect(res.statusCode).toBe(200);
    expect(userControllerMock.resetPassword).toHaveBeenCalled();
  });
}); 