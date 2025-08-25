jest.mock('../../src/config/logger', () => ({
  requestLogger: jest.fn((req, res, next) => next()),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

jest.mock('../../src/config/metrics', () => {
  const promClient = require('prom-client');
  const register = new promClient.Registry();
  return {
    register,
    errorCount: { inc: jest.fn() },
    httpRequestDuration: { startTimer: jest.fn(() => jest.fn()) }
  };
});

const request = require('supertest');
const app = require('../../src/app');

describe('app integration: health and metrics', () => {
  test('GET /health returns 200 and payload', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('service', 'ticket-service');
  });

  test('GET /metrics returns text/plain OpenMetrics or Prometheus', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(typeof res.text).toBe('string');
  });
});


