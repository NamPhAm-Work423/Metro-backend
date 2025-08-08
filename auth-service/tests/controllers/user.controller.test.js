jest.mock('../../src/services/user.service', () => ({
  signup: jest.fn(),
  login: jest.fn(),
  refreshToken: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
}));
jest.mock('../../src/events/user.producer.event', () => ({ publishUserLogin: jest.fn().mockResolvedValue() }));

const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');
const userService = require('../../src/services/user.service');
const userController = require('../../src/controllers/user.controller');

function appWith(route) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
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
});


