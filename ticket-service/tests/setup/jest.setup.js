// Ensure NODE_ENV is test
process.env.NODE_ENV = 'test';

// Load global mocks to silence infra side-effects
require('./jest.setup.mocks');
// Stable Math.random
jest.spyOn(global.Math, 'random').mockReturnValue(0.42);

// Ensure unhandled rejections fail tests fast in Jest 29+
process.on('unhandledRejection', (err) => {
  // Surface the error to fail the current test
  throw err;
});

// Common environment defaults for tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.TZ = process.env.TZ || 'UTC';

// Silence noisy library warnings in tests
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});

// Silence noisy library warnings in tests
process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';


