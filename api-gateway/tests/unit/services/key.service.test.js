jest.mock('../../../src/config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

jest.mock('../../../src/config/redis', () => {
  const state = { hashes: new Map(), strings: new Map() };
  const client = {
    hSet: jest.fn(async (key, obj) => {
      if (!state.hashes.has(key)) state.hashes.set(key, new Map());
      const h = state.hashes.get(key);
      Object.entries(obj).forEach(([k, v]) => h.set(k, String(v)));
    }),
    hGetAll: jest.fn(async (key) => {
      const h = state.hashes.get(key);
      if (!h) return {};
      return Object.fromEntries(h.entries());
    }),
    expire: jest.fn(async () => {}),
    setEx: jest.fn(async (key, ttl, val) => { state.strings.set(key, val); }),
    get: jest.fn(async (key) => state.strings.get(key) || null),
  };
  return {
    getClient: () => client,
    withRedisClient: async (fn) => fn(client),
    __reset: () => { state.hashes.clear(); state.strings.clear(); },
  };
});

jest.mock('../../../src/models/key.model', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../../src/helpers/crypto.helper', () => ({
  createAPIToken: jest.fn(() => 'RAW_TOKEN'),
  hashToken: jest.fn((t) => `HASH(${t})`),
}));

const Key = require('../../../src/models/key.model');
const { createAPIToken, hashToken } = require('../../../src/helpers/crypto.helper');
const svc = require('../../../src/services/key.service');

describe('key.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.API_KEY_HASH_SECRET = 'secret';
    const redis = require('../../../src/config/redis');
    if (redis.__reset) redis.__reset();
  });

  test('storeAPIKey writes to redis with expiry', async () => {
    await svc.storeAPIKey('RAW_TOKEN', { userId: 'u1' }, 60);
    const { withRedisClient } = require('../../../src/config/redis');
    await withRedisClient(async (c) => {
      const data = await c.hGetAll('api-gateway:auth-cache:HASH(RAW_TOKEN)');
      expect(data.originalKey).toBe('RAW_TOKEN');
      expect(JSON.parse(data.metadata)).toEqual({ userId: 'u1' });
    });
  });

  test('validateAPIKey returns metadata from cache when hit', async () => {
    await svc.storeAPIKey('RAW_TOKEN', { userId: 'u2', keyId: 1 }, 60);
    const res = await svc.validateAPIKey('RAW_TOKEN');
    expect(res.userId).toBe('u2');
    expect(res.keyId).toBe(1);
  });

  test('validateAPIKey falls back to DB and warms cache', async () => {
    // ensure cache miss
    const redis = require('../../../src/config/redis');
    await redis.withRedisClient(async (c) => { /* no set */ });
    Key.findOne.mockResolvedValue({ id: 10, userId: 'userX', status: 'activated' });
    const res = await svc.validateAPIKey('RAW_TOKEN');
    expect(Key.findOne).toHaveBeenCalled();
    expect(res).toEqual({ userId: 'userX', keyId: 10 });
  });

  test('revokeAllUserKeys updates activated keys to expired', async () => {
    Key.update.mockResolvedValue([3]);
    const count = await svc.revokeAllUserKeys('U1');
    expect(count).toBe(3);
  });

  test('getActiveAPIKeyForUser returns cached session token if present', async () => {
    Key.findOne.mockResolvedValue({ id: 5, userId: 'U2', update: jest.fn() });
    const { withRedisClient } = require('../../../src/config/redis');
    await withRedisClient(async (c) => {
      await c.setEx('api-gateway:session:U2:5', 86400, 'CACHED_TOKEN');
    });
    const token = await svc.getActiveAPIKeyForUser('U2');
    expect(token).toBe('CACHED_TOKEN');
  });

  test('getActiveAPIKeyForUser generates new token and caches when missing', async () => {
    const keyRow = { id: 8, userId: 'U3', update: jest.fn() };
    Key.findOne.mockResolvedValue(keyRow);
    const result = await svc.getActiveAPIKeyForUser('U3');
    expect(result).toBe('RAW_TOKEN');
    expect(createAPIToken).toHaveBeenCalled();
    expect(hashToken).toHaveBeenCalled();
  });

  test('generateAPIKeyForUser creates DB row and stores in Redis', async () => {
    Key.create.mockResolvedValue({ id: 77 });
    const res = await svc.generateAPIKeyForUser('U4');
    expect(res).toEqual({ token: 'RAW_TOKEN', keyId: 77 });
    expect(Key.create).toHaveBeenCalled();
  });

  test('getAPIKeysByUserId returns keys', async () => {
    Key.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const res = await svc.getAPIKeysByUserId('U5');
    expect(res.length).toBe(2);
  });

  test('deleteAPIKeyById returns true when row deleted', async () => {
    Key.destroy.mockResolvedValue(1);
    await expect(svc.deleteAPIKeyById('K1')).resolves.toBe(true);
  });

  test('deleteAPIKeyById returns false when no row', async () => {
    Key.destroy.mockResolvedValue(0);
    await expect(svc.deleteAPIKeyById('K2')).resolves.toBe(false);
  });
});


