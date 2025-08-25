jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(function (evt, cb) {
      // store callbacks for manual invocation
      this._events = this._events || {};
      this._events[evt] = cb;
    }),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue('OK'),
    removeAllListeners: jest.fn()
  }))
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}));

const redisLib = require('redis');

describe('redis events and shutdown', () => {
  test('error and end events clear client and call quit', async () => {
    const mod = require('../../../src/config/redis');
    await mod.initializeRedis();
    const client = redisLib.createClient.mock.results[0].value;

    // trigger error handler
    await client._events.error(new Error('oops'));
    // trigger end handler
    await client._events.end();

    expect(client.quit).toHaveBeenCalled();
  });

  test('SIGINT/SIGTERM handlers call quit when client exists', async () => {
    const mod = require('../../../src/config/redis');
    await mod.initializeRedis();
    const client = redisLib.createClient.mock.results[redisLib.createClient.mock.results.length - 1].value;

    process.emit('SIGINT');
    process.emit('SIGTERM');

    expect(client.quit).toHaveBeenCalled();
  });
});


