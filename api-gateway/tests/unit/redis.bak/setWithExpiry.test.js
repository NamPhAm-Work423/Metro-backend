const path = require('path');

// mock redis
jest.mock('redis', () => {
  const calls = [];
  const fakeClient = {
    connect: jest.fn().mockResolvedValue(),
    set: jest.fn((key, value, options) => {
      calls.push({ key, value, options });
      return Promise.resolve('OK');
    }),
    get: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(),
    removeAllListeners: jest.fn(),
  };
  return { createClient: jest.fn(() => fakeClient), __calls: calls };
});

const redisMock = require('redis');
const { setWithExpiry, initializeRedis } = require(path.join(__dirname, '..', '..', '..', 'src', 'config', 'redis'));

describe('setWithExpiry TTL behaviour', () => {
  beforeAll(async () => {
    await initializeRedis();
  });

  it('should call redis.set with EX option when expiry is specified', async () => {
    await setWithExpiry('ttl:key', 'value', 120);
    const call = redisMock.__calls.pop();
    expect(call.options).toEqual({ EX: 120 });
  });

  it('should default EX to 3600 seconds when not provided', async () => {
    await setWithExpiry('default:key', 'val');
    const call = redisMock.__calls.pop();
    expect(call.options).toEqual({ EX: 3600 });
  });
}); 