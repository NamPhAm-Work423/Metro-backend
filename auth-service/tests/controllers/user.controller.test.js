jest.mock('../../src/services/user.service', () => ({
  signup: jest.fn(),
  login: jest.fn(),
  refreshToken: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  resendVerification: jest.fn(),
}));
jest.mock('../../src/events/user.producer.event', () => ({ publishUserLogin: jest.fn().mockResolvedValue() }));

// Mock session configuration for tests
jest.mock('../../src/config/session', () => ({
  createUserSession: jest.fn(),
  destroyUserSession: jest.fn(),
  requireSession: jest.fn((req, res, next) => next()),
  optionalSession: jest.fn((req, res, next) => next()),
  updateSessionActivity: jest.fn()
}));

// Mock Redis for tests
jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    connect: jest.fn(),
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn()
  }))
}));

const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');
const userService = require('../../src/services/user.service');
const userController = require('../../src/controllers/user.controller');

function appWith(route) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  
  // Mock session middleware for tests
  app.use((req, res, next) => {
    req.session = {};
    req.sessionID = 'test-session-id';
    next();
  });
  
  route(app);
  return app;
}

describe('user.controller', () => {
  test('signup success', async () => {
    userService.signup.mockResolvedValue({ user: { email: 'a@b.com', username: 'john', roles: ['passenger'] } });
    const app = appWith(app => app.post('/register', userController.signup));
    const res = await request(app).post('/register').send({ email: 'a@b.com', username: 'john', password: 'P@ssw0rd' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('login success sets cookies', async () => {
    userService.login.mockResolvedValue({ user: { id: 'u1', email: 'a@b.com', username: 'john', roles: [] }, tokens: { accessToken: 'a', refreshToken: 'r' } });
    const app = appWith(app => app.post('/login', userController.login));
    const res = await request(app).post('/login').send({ email: 'a@b.com', password: 'x' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('refresh token requires cookie', async () => {
    const app = appWith(app => app.post('/refresh', userController.refreshToken));
    const res = await request(app).post('/refresh');
    expect(res.status).toBe(401);
  });

  test('resendVerification success', async () => {
    userService.resendVerification.mockResolvedValue({ success: true, message: 'Verification email sent successfully' });
    const app = appWith(app => app.post('/resend-verification', userController.resendVerification));
    const res = await request(app).post('/resend-verification').send({ email: 'test@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Verification email sent successfully');
  });

  test('resendVerification missing email', async () => {
    const app = appWith(app => app.post('/resend-verification', userController.resendVerification));
    const res = await request(app).post('/resend-verification').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('EMAIL_REQUIRED');
  });

  test('resendVerification invalid email format', async () => {
    const app = appWith(app => app.post('/resend-verification', userController.resendVerification));
    const res = await request(app).post('/resend-verification').send({ email: 'invalid-email' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('INVALID_EMAIL_FORMAT');
  });

  test('resendVerification user not found', async () => {
    userService.resendVerification.mockRejectedValue(new Error('User not found'));
    const app = appWith(app => app.post('/resend-verification', userController.resendVerification));
    const res = await request(app).post('/resend-verification').send({ email: 'nonexistent@example.com' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('USER_NOT_FOUND');
  });

  test('resendVerification user already verified', async () => {
    userService.resendVerification.mockRejectedValue(new Error('User is already verified'));
    const app = appWith(app => app.post('/resend-verification', userController.resendVerification));
    const res = await request(app).post('/resend-verification').send({ email: 'verified@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('USER_ALREADY_VERIFIED');
  });
});


