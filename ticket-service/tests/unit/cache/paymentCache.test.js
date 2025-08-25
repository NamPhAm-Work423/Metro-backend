jest.mock('../../../src/config/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn() }
}));

const { PaymentCache } = require('../../../src/cache/paymentCache');

describe('PaymentCache', () => {
  test('set/get within freshness window', () => {
    const cache = new PaymentCache();
    cache.stopCleanup();

    cache.set('k1', { amount: 100, paymentMethod: 'card', paymentUrl: 'u' });
    const data = cache.get('k1');

    expect(data).toMatchObject({ amount: 100, paymentMethod: 'card', paymentUrl: 'u' });
    expect(typeof data.timestamp).toBe('number');
  });

  test('get returns null when expired', () => {
    const cache = new PaymentCache();
    cache.stopCleanup();

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    cache.set('k2', { amount: 50 });

    // Advance time > 5 minutes
    Date.now.mockReturnValue(now + 301000);
    const data = cache.get('k2');
    expect(data).toBeNull();
    Date.now.mockRestore();
  });

  test('delete and clear', () => {
    const cache = new PaymentCache();
    cache.stopCleanup();

    cache.set('k3', { a: 1 });
    expect(cache.delete('k3')).toBe(true);
    cache.set('k4', { a: 2 });
    expect(cache.getStats().size).toBe(1);
    cache.clear();
    expect(cache.getStats().size).toBe(0);
  });
});


