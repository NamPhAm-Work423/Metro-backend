const CustomError = require('../../../src/utils/customError');

describe('CustomError', () => {
  test('sets status and statusCode', () => {
    const e = new CustomError('not found', 404);
    expect(e.message).toBe('not found');
    expect(e.statusCode).toBe(404);
    expect(e.status).toBe('fail');
    expect(e.isOperational).toBe(true);
  });

  test('5xx maps to error status', () => {
    const e = new CustomError('boom', 500);
    expect(e.status).toBe('error');
  });
});


