const express = require('express');
const request = require('supertest');

// Silence logger during tests
jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  requestLogger: () => (req, res, next) => next(),
}));

// Mock heavy dependencies to avoid route registration side-effects
jest.mock('../../../src/services/user.service', () => ({ signup: jest.fn(), login: jest.fn() }));
jest.mock('../../../src/models/user.model', () => ({}));

const userController = require('../../../src/controllers/user.controller');

describe('Logout cookie behaviour', () => {
  const app = express();
  // Fake auth middleware to attach a user so controller passes logger.info
  app.use((req, _res, next) => {
    req.user = { id: 'test-user' };
    next();
  });
  app.post('/logout', userController.logout);

  it('should clear accessToken and refreshToken cookies', async () => {
    const res = await request(app).post('/logout');

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'];
    expect(Array.isArray(cookies)).toBe(true);

    // Check both cookies are present and marked for deletion (Max-Age=0 or expired)
    const accessCleared = cookies.find((c) => c.startsWith('accessToken='));
    const refreshCleared = cookies.find((c) => c.startsWith('refreshToken='));
    expect(accessCleared).toBeTruthy();
    expect(refreshCleared).toBeTruthy();

    // Ensure httpOnly and SameSite attributes are set
    expect(accessCleared).toMatch(/HttpOnly/i);
    expect(refreshCleared).toMatch(/HttpOnly/i);
    expect(accessCleared).toMatch(/SameSite=None/i);
  });
}); 