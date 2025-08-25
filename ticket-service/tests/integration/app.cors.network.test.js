jest.mock('../../src/config/logger', () => ({
  requestLogger: jest.fn((req, res, next) => next()),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

// Avoid production PaymentCache intervals when app initializes
jest.mock('../../src/cache/paymentCache', () => ({
  paymentCache: { clear: jest.fn(), stopCleanup: jest.fn() }
}));

const request = require('supertest');

describe('app CORS and network validation branches', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalGateway = process.env.API_GATEWAY_ORIGIN;
  const originalAllowed = process.env.ALLOWED_ORIGINS;

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.API_GATEWAY_ORIGIN = originalGateway;
    process.env.ALLOWED_ORIGINS = originalAllowed;
  });

  // Note: Supertest runs locally; req.ip is localhost which is allowed.
  // We instead cover the allow path explicitly via x-service-auth in the next test.

  test('network validation allows with x-service-auth (falls to 404)', async () => {
    const app = require('../../src/app');
    const res = await request(app)
      .get('/not-found-path')
      .set('Host', 'bad.example.com')
      .set('X-Forwarded-For', '8.8.8.8')
      .set('X-Service-Auth', 'Bearer token');
    expect(res.status).toBe(404);
  });

  test('CORS allows configured origins and denies others', async () => {
    process.env.NODE_ENV = 'development';
    process.env.API_GATEWAY_ORIGIN = 'https://gateway.local';
    process.env.ALLOWED_ORIGINS = 'https://app.local, https://admin.local';
    jest.resetModules();
    const app = require('../../src/app');

    const allowed = await request(app)
      .get('/health')
      .set('Origin', 'https://gateway.local');
    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://gateway.local');

    const denied = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.local');
    // Denied CORS triggers an error handled by Express -> 500
    expect(denied.status).toBe(500);
  });
});


