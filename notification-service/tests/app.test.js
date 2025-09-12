const request = require('supertest');
const express = require('express');

// Mock models to avoid touching real sequelize define
jest.mock('../src/models', () => ({
  sequelize: { define: jest.fn() },
  Email: {},
  SMS: {},
}));

// Mock routes to avoid importing controllers/models
jest.mock('../src/routes', () => {
  const router = require('express').Router();
  // no-op routes for tests; real endpoints covered elsewhere
  router.get('/noop', (_req, res) => res.sendStatus(204));
  return router;
});

// Stub metrics register before importing app
jest.mock('../src/config/metrics', () => {
  const metrics = {
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
    metrics: jest.fn().mockResolvedValue('# HELP dummy\n# TYPE dummy counter\ndummy 1\n'),
  };
  return { register: metrics };
});

// Stub logger to avoid noisy output
jest.mock('../src/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  requestLogger: (req, _res, next) => next(),
}));

const App = require('../src/app');

describe('App endpoints', () => {
  let app;
  beforeAll(() => {
    app = new App().getApp();
  });

  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('GET /metrics returns metrics text', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('dummy 1');
  });
});
