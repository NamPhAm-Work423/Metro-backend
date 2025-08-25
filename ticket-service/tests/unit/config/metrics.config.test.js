const promClient = require('prom-client');

// Lazy-require module under test to allow jest mocks first
describe('config/metrics', () => {
  let metrics;

  beforeAll(() => {
    jest.spyOn(promClient, 'collectDefaultMetrics').mockImplementation(() => {});
    jest.spyOn(promClient.Registry.prototype, 'registerMetric').mockImplementation(() => {});
    metrics = require('../../../src/config/metrics');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('exports register, httpRequestDuration, errorCount', () => {
    expect(metrics).toHaveProperty('register');
    expect(metrics).toHaveProperty('httpRequestDuration');
    expect(metrics).toHaveProperty('errorCount');
  });

  test('collects default metrics and registers custom metrics', () => {
    const collectSpy = jest.spyOn(promClient, 'collectDefaultMetrics');
    const regSpy = jest.spyOn(promClient.Registry.prototype, 'registerMetric');

    // Re-require to trigger module init
    jest.resetModules();
    jest.doMock('prom-client', () => promClient, { virtual: true });
    require('../../../src/config/metrics');

    expect(collectSpy).toHaveBeenCalled();
    expect(regSpy).toHaveBeenCalled();
  });
});


