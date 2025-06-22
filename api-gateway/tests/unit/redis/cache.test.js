const path = require('path');

// Jest mock for the "redis" package so we can run tests without a real Redis server
jest.mock('redis', () => {
  const store = new Map();

  const fakeClient = {
    connect: jest.fn().mockResolvedValue(),
    // `set` with options object { EX: seconds }
    set: jest.fn((key, value, _options) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    get: jest.fn((key) => Promise.resolve(store.get(key) ?? null)),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(),
    removeAllListeners: jest.fn(),
  };

  return {
    createClient: jest.fn(() => fakeClient),
  };
});

// Import after mocking so the module uses the mocked redis implementation
const {
  setWithExpiry,
  getClient,
  initializeRedis,
} = require(path.join(__dirname, '..', '..', '..', 'src', 'config', 'redis'));

/**
 * Basic unit test to make sure `setWithExpiry` actually saves data in the mocked Redis store
 */
describe('Redis caching helper – setWithExpiry', () => {
  beforeAll(async () => {
    // initialize mocked Redis client
    await initializeRedis();
  });

  it('should store and retrieve a value with the provided key', async () => {
    const key = 'test:key';
    const value = 'cached-value';

    // Store value with 1-hour expiry
    await setWithExpiry(key, value, 3600);

    // Fetch directly from underlying client to validate
    const client = getClient();
    const stored = await client.get(key);

    expect(stored).toBe(value);
  });
}); 