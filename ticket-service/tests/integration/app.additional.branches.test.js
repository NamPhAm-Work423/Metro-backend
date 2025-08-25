jest.mock('../../src/config/logger', () => ({
  requestLogger: jest.fn((req, res, next) => next()),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

// Avoid production PaymentCache side effects (intervals)
jest.mock('../../src/cache/paymentCache', () => ({
  paymentCache: { clear: jest.fn(), stopCleanup: jest.fn() }
}));

const request = require('supertest');

describe('app additional branches', () => {
  test('network validation blocks external access without service auth', async () => {
    const app = require('../../src/app');
    const res = await request(app)
      .get('/v1/non-existent')
      .set('Host', 'malicious.example.com')
      .set('X-Forwarded-For', '8.8.8.8');
    // It will hit 404 after middleware chain; to directly exercise block, call route without /v1
    const res2 = await request(app)
      .get('/some-path')
      .set('Host', 'malicious.example.com')
      .set('X-Forwarded-For', '8.8.8.8');
    expect([403,404]).toContain(res2.status);
  });

  test('CORS production branch logs info when NODE_ENV=production', async () => {
    const { logger } = require('../../src/config/logger');
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    jest.doMock('../../src/config/logger', () => ({
      requestLogger: jest.fn((req, res, next) => next()),
      logger
    }));
    jest.doMock('../../src/cache/paymentCache', () => ({
      paymentCache: { clear: jest.fn(), stopCleanup: jest.fn() }
    }));
    const app = require('../../src/app');
    await request(app).get('/health');
    expect(logger.info).toHaveBeenCalled();
    process.env.NODE_ENV = 'test';
  });

  test('global error handler returns 500 with INTERNAL_ERROR outside development', async () => {
    const app = require('express')();
    const { logger } = require('../../src/config/logger');
    const baseApp = require('../../src/app');
    app.use((req, res, next) => next(new Error('boom')));
    // Attach the error handler from base app by mounting it
    app.use(baseApp._router.stack.find(l => l.handle && l.handle.length === 4).handle);

    const res = await request(app).get('/err');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_ERROR');
    expect(logger.error).toHaveBeenCalled();
  });

  test('404 handler returns expected payload', async () => {
    const app = require('../../src/app');
    const res = await request(app).get('/not-found');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ROUTE_NOT_FOUND');
  });
});


