const { logger, requestLogger } = require('../../../src/config/logger');

describe('config/logger', () => {
  test('requestLogger logs on finish with expected fields', () => {
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});

    const req = {
      method: 'GET',
      originalUrl: '/health',
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' }
    };
    const res = {
      statusCode: 200,
      on: (evt, cb) => evt === 'finish' && cb()
    };
    const next = jest.fn();

    requestLogger(req, res, next);

    expect(infoSpy).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();

    infoSpy.mockRestore();
  });
});


