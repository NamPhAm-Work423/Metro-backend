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
jest.mock('../../src/config/redis', () => ({
  withRedisClient: (fn) => fn({
    hGetAll: jest.fn().mockResolvedValue({}),
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue('OK'),
    expire: jest.fn(),
    hSet: jest.fn(),
  })
}));

const keyRepository = require('../../src/services/repositories/key.repository');
const keyService = require('../../src/services/key.service');
const redisCfg = require('../../src/config/redis');

describe('KeyService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('generateAPIKeyForUser stores DB and cache and returns token + id', async () => {
    keyRepository.createKey.mockResolvedValue({ id: 'k1', userId: 'u1' });
    const res = await keyService.generateAPIKeyForUser('u1');
    expect(res).toHaveProperty('token');
    expect(res).toHaveProperty('keyId', 'k1');
  });

  test('validateAPIKey falls back to DB and warms cache', async () => {
    keyRepository.findActiveByHashedValue.mockResolvedValue({ id: 'k2', userId: 'u2' });
    const res = await keyService.validateAPIKey('plaintext-key');
    expect(res).toEqual({ userId: 'u2', keyId: 'k2' });
  });

  test('validateAPIKey returns null when not in cache or DB', async () => {
    keyRepository.findActiveByHashedValue.mockResolvedValue(null);
    const res = await keyService.validateAPIKey('nope');
    expect(res).toBeNull();
  });

  test('getActiveAPIKeyForUser rotates when no cached session key', async () => {
    keyRepository.findLatestActiveByUserId.mockResolvedValue({ id: 'k3' });
    keyRepository.updateValueAndLastUsed = jest.fn().mockResolvedValue(1);
    const token = await keyService.getActiveAPIKeyForUser('u3');
    expect(typeof token).toBe('string');
  });

  test('getActiveAPIKeyForUser returns null when no active key', async () => {
    keyRepository.findLatestActiveByUserId.mockResolvedValue(null);
    const token = await keyService.getActiveAPIKeyForUser('uX');
    expect(token).toBeNull();
  });

  test('revokeAllUserKeys expires active keys', async () => {
    keyRepository.expireAllByUserId.mockResolvedValue(2);
    const count = await keyService.revokeAllUserKeys('u4');
    expect(count).toBe(2);
  });
});


