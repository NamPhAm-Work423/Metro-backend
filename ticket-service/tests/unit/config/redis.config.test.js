jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue('OK')
  }))
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}));

const redisLib = require('redis');
const { initializeRedis, withRedisClient, setWithExpiry, getClient } = require('../../../src/config/redis');

describe('config/redis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    delete process.env.REDIS_PASSWORD;
  });

  test('initializeRedis connects and sets client', async () => {
    await expect(initializeRedis()).resolves.toBe(true);
    expect(redisLib.createClient).toHaveBeenCalled();
    expect(getClient()).toBeTruthy();
  });

  test('setWithExpiry uses SET with EX', async () => {
    await initializeRedis();
    await setWithExpiry('k', 'v', 10);
    const client = getClient();
    expect(client.set).toHaveBeenCalledWith('k', 'v', { EX: 10 });
  });

  test('withRedisClient returns null when client unavailable', async () => {
    jest.resetModules();
    const redis = require('redis');
    redis.createClient.mockImplementation(() => { throw new Error('fail'); });
    const mod = require('../../../src/config/redis');
    const out = await mod.withRedisClient(async () => 'ok');
    expect(out).toBeNull();
  });
});


