jest.mock('../../src/config/redis', () => {
  const state = { lastClient: null };
  return {
    __state: state,
    withRedisClient: async (fn) => {
      const client = {
        hSet: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
      };
      state.lastClient = client;
      await fn(client);
      return true;
    }
  };
});

jest.mock('../../src/helpers/crypto.helper', () => ({
  hashToken: () => 'HASHED',
}));

const redis = require('../../src/config/redis');
const { formatAPIKey, formatSessionKey, storeAPIKey } = require('../../src/services/caches/apiKey.cache');

describe('apiKey.cache', () => {
  test('formatters apply prefix correctly', () => {
    const k = formatAPIKey('X');
    const s = formatSessionKey('u1', 'k1');
    expect(k.startsWith(process.env.REDIS_KEY_PREFIX + 'auth-cache:')).toBe(true);
    expect(s).toBe(`${process.env.REDIS_KEY_PREFIX}session:u1:k1`);
  });

  test('storeAPIKey writes to redis with expected fields', async () => {
    await storeAPIKey('plain-key', { a: 1 }, 10);
    const client = redis.__state.lastClient;
    expect(client.hSet).toHaveBeenCalled();
    const [keyArg, fields] = client.hSet.mock.calls[0];
    expect(keyArg.includes('auth-cache:')).toBe(true);
    expect(fields).toHaveProperty('originalKey', 'plain-key');
    expect(fields).toHaveProperty('metadata');
    expect(() => JSON.parse(fields.metadata)).not.toThrow();
    expect(client.expire).toHaveBeenCalledWith(keyArg, 10);
  });
});


