describe('logger transports in non-test env', () => {
  const originalEnv = process.env.NODE_ENV;
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
  });
  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('adds at least console transport when production', () => {
    const loggerModule = require('../../../src/config/logger');
    const logger = loggerModule.logger;
    // Winston logger stores transports array
    expect(Array.isArray(logger.transports)).toBe(true);
    expect(logger.transports.length).toBeGreaterThan(0);
  });
});


