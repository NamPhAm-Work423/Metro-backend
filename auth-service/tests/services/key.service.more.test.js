jest.mock('../../src/services/repositories/key.repository', () => ({
  findActiveByHashedValue: jest.fn(),
  findActiveByUserId: jest.fn(),
  findLatestActiveByUserId: jest.fn(),
  createKey: jest.fn(),
  updateLastUsedAt: jest.fn(),
  updateValueAndLastUsed: jest.fn(),
  expireAllByUserId: jest.fn(),
  deleteById: jest.fn(),
}));

jest.mock('../../src/config/redis', () => {
  const client = {
    hGetAll: jest.fn().mockResolvedValue({}),
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue('OK'),
    expire: jest.fn(),
    hSet: jest.fn(),
  };
  return { withRedisClient: (fn) => fn(client), __client: client };
});

const keyRepository = require('../../src/services/repositories/key.repository');
const redis = require('../../src/config/redis');
const keyService = require('../../src/services/key.service');

describe('KeyService extra coverage', () => {
  beforeEach(() => jest.resetAllMocks());

  test('validateAPIKey returns cached metadata on cache hit', async () => {
    redis.__client.hGetAll.mockResolvedValue({ createdAt: '1', metadata: JSON.stringify({ userId: 'u9', keyId: 'k9' }) });
    const res = await keyService.validateAPIKey('abc');
    expect(res).toEqual({ userId: 'u9', keyId: 'k9', createdAt: '1' });
  });

  test('getAPIKeysByUserId returns array', async () => {
    keyRepository.findActiveByUserId.mockResolvedValue([{ id: 'k1' }, { id: 'k2' }]);
    const res = await keyService.getAPIKeysByUserId('u1');
    expect(res.length).toBe(2);
  });

  test('deleteAPIKeyById returns true when deletedCount>0', async () => {
    keyRepository.deleteById.mockResolvedValue(1);
    const ok = await keyService.deleteAPIKeyById('k1');
    expect(ok).toBe(true);
  });

  test('getActiveAPIKeyForUser returns cached token and updates lastUsedAt', async () => {
    keyRepository.findLatestActiveByUserId.mockResolvedValue({ id: 'kC' });
    keyRepository.updateLastUsedAt.mockResolvedValue(1);
    // simulate cache hit on session key
    redis.__client.get = jest.fn().mockResolvedValue('cached-token');
    const token = await keyService.getActiveAPIKeyForUser('uC');
    expect(token).toBe('cached-token');
    expect(keyRepository.updateLastUsedAt).toHaveBeenCalled();
  });

  test('validateAPIKey returns null on redis error (catch path)', async () => {
    // Temporarily replace withRedisClient to throw
    const original = redis.withRedisClient;
    redis.withRedisClient = () => { throw new Error('boom'); };
    const res = await keyService.validateAPIKey('x');
    expect(res).toBeNull();
    // restore
    redis.withRedisClient = original;
  });
});


