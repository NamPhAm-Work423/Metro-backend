jest.mock('../../src/config/logger', () => ({
  requestLogger: jest.fn((req, res, next) => next()),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

// Avoid production PaymentCache intervals
jest.mock('../../src/cache/paymentCache', () => ({
  paymentCache: { clear: jest.fn(), stopCleanup: jest.fn() }
}));

const request = require('supertest');

describe('app network validation specific branches', () => {
  test('network validation allows localhost/127.0.0.1', async () => {
    const app = require('../../src/app');
    const res = await request(app)
      .get('/health')
      .set('Host', 'localhost:3000');
    expect(res.status).toBe(200);
  });

  test('network validation allows private network ranges', async () => {
    const app = require('../../src/app');
    const res = await request(app)
      .get('/health')
      .set('X-Forwarded-For', '192.168.1.100');
    expect(res.status).toBe(200);
  });

  test('network validation allows api-gateway host', async () => {
    const app = require('../../src/app');
    const res = await request(app)
      .get('/health')
      .set('Host', 'api-gateway:8080');
    expect(res.status).toBe(200);
  });
});
