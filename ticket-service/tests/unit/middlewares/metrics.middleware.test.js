jest.mock('../../../src/config/metrics', () => ({
  httpRequestDuration: {
    startTimer: jest.fn(() => jest.fn())
  }
}));

const metricsMiddleware = require('../../../src/middlewares/metrics.middleware');
const { httpRequestDuration } = require('../../../src/config/metrics');

describe('metrics.middleware', () => {
  test('starts and ends timer with labels', () => {
    const endSpy = jest.fn();
    httpRequestDuration.startTimer.mockReturnValue(endSpy);

    const req = { method: 'GET', path: '/health' };
    const res = {
      statusCode: 200,
      on: (evt, cb) => {
        if (evt === 'finish') cb();
      }
    };
    const next = jest.fn();

    metricsMiddleware(req, res, next);

    expect(httpRequestDuration.startTimer).toHaveBeenCalledWith({
      method: 'GET',
      route: '/health'
    });
    expect(endSpy).toHaveBeenCalledWith({ status_code: 200 });
    expect(next).toHaveBeenCalled();
  });
});


