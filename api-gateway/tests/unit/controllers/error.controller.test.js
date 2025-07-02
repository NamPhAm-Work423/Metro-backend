// Clear module cache first
beforeAll(() => {
  delete require.cache[require.resolve('../../../src/config/logger')];
  delete require.cache[require.resolve('../../../src/controllers/error.controller')];
});

// Mock logger BEFORE importing controller
const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.doMock('../../../src/config/logger', () => ({
  logger: mockLogger
}));

const { errorHandler } = require('../../../src/controllers/error.controller');

describe('Error Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      originalUrl: '/api/v1/test',
      method: 'GET',
      id: 'request-123'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    
    // Clear mocks
    mockLogger.error.mockClear();
    res.status.mockClear();
    res.json.mockClear();
  });

  describe('errorHandler', () => {
    it('should handle error with default status code 500', () => {
      const error = new Error('Test error');
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error'
      });
      // Note: Logger functionality is tested in unit, here we focus on response handling
    });

    it('should handle error with custom status code', () => {
      const error = new Error('Not found');
      error.statusCode = 404;
      error.status = 'fail';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Not found'
      });
    });

    it('should include stack trace in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Development error');
      error.statusCode = 400;

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Development error',
        stack: error.stack
      });

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Production error');
      error.statusCode = 500;

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Production error'
      });

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle validation errors (400)', () => {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.status = 'fail';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Validation failed'
      });
    });

    it('should handle unauthorized errors (401)', () => {
      const error = new Error('Unauthorized access');
      error.statusCode = 401;
      error.status = 'fail';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Unauthorized access'
      });
    });

    it('should handle forbidden errors (403)', () => {
      const error = new Error('Forbidden resource');
      error.statusCode = 403;
      error.status = 'fail';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Forbidden resource'
      });
    });

    it('should set default error status and status code', () => {
      const error = new Error('Generic error');
      
      errorHandler(error, req, res, next);

      expect(error.statusCode).toBe(500);
      expect(error.status).toBe('error');
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should preserve existing error status and status code', () => {
      const error = new Error('Custom error');
      error.statusCode = 422;
      error.status = 'fail';
      
      errorHandler(error, req, res, next);

      expect(error.statusCode).toBe(422);
      expect(error.status).toBe('fail');
      expect(res.status).toHaveBeenCalledWith(422);
    });
  });
}); 