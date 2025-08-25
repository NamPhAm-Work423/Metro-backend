jest.useFakeTimers();

jest.mock('../../../src/config/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn() }
}));

const { PaymentCache } = require('../../../src/cache/paymentCache');

describe('PaymentCache cleanup in production', () => {
  const originalEnv = process.env.NODE_ENV;
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
  });
  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('periodically deletes expired entries', () => {
    const cache = new PaymentCache();
    cache.set('x', { a: 1 });

    // Advance time by > 5 minutes to mark expired, and tick cleanup interval
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 301000);

    // Cleanup runs every 120000ms; advance a few intervals
    jest.advanceTimersByTime(240000);

    expect(cache.get('x')).toBeNull();
    cache.stopCleanup();
    Date.now.mockRestore();
  });
});


