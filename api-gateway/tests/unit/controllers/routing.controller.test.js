const routingController = require('../../../src/controllers/routing.controller');
const routingService = require('../../../src/services/routing.service');

// Mock routing service
jest.mock('../../../src/services/routing.service');

// Mock async error handler
jest.mock('../../../src/helpers/errorHandler.helper', () => {
  return jest.fn().mockImplementation((fn) => fn);
});

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock CustomError to mimic real class behavior
jest.mock('../../../src/utils/CustomError', () => {
  const MockCustomError = function(message, statusCode) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    this.statusCode = statusCode;
  };
  MockCustomError.prototype = Object.create(Error.prototype);
  MockCustomError.prototype.constructor = MockCustomError;
  return MockCustomError;
});

describe('Routing Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      method: 'GET',
      originalUrl: '/api/v1/test',
      get: jest.fn(),
      ip: '127.0.0.1'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('useService', () => {
    it('should route request to service successfully', async () => {
      req.params = { endPoint: 'users', 0: 'profile' };
      req.get.mockReturnValue('Mozilla/5.0');
      routingService.routeRequest.mockResolvedValue();

      await routingController.useService(req, res, next);

      expect(routingService.routeRequest).toHaveBeenCalledWith(req, res, 'users', 'profile');
    });

    it('should handle URL-encoded endpoint', async () => {
      req.params = { endPoint: 'passengers%2Fme', 0: undefined };
      req.get.mockReturnValue('Mozilla/5.0');
      routingService.routeRequest.mockResolvedValue();

      await routingController.useService(req, res, next);

      expect(routingService.routeRequest).toHaveBeenCalledWith(req, res, 'passengers', 'me');
    });

    it('should handle complex URL-encoded paths', async () => {
      req.params = { endPoint: 'transport%2Froutes', 0: '123/stations' };
      req.get.mockReturnValue('Mozilla/5.0');
      routingService.routeRequest.mockResolvedValue();

      await routingController.useService(req, res, next);

      expect(routingService.routeRequest).toHaveBeenCalledWith(req, res, 'transport', 'routes/123/stations');
    });

    it('should handle endpoint with slash in params', async () => {
      req.params = { endPoint: 'users/profile', 0: 'settings' };
      req.get.mockReturnValue('Mozilla/5.0');
      routingService.routeRequest.mockResolvedValue();

      await routingController.useService(req, res, next);

      expect(routingService.routeRequest).toHaveBeenCalledWith(req, res, 'users', 'profile/settings');
    });

    it('should handle CustomError from routing service', async () => {
      req.params = { endPoint: 'invalid', 0: undefined };
      const CustomError = require('../../../src/utils/CustomError');
      const customError = new CustomError('Service not found', 404);
      routingService.routeRequest.mockRejectedValue(customError);

      await routingController.useService(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Service not found',
        error: 'ROUTING_ERROR'
      });
    });

    it('should handle generic errors from routing service', async () => {
      req.params = { endPoint: 'users', 0: undefined };
      const error = new Error('Generic error');
      routingService.routeRequest.mockRejectedValue(error);

      await routingController.useService(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal routing error',
        error: 'INTERNAL_ERROR'
      });
    });

    it('should handle exact endpoint match without additional path', async () => {
      req.params = { endPoint: 'tickets', 0: undefined };
      req.get.mockReturnValue('Mozilla/5.0');
      routingService.routeRequest.mockResolvedValue();

      await routingController.useService(req, res, next);

      expect(routingService.routeRequest).toHaveBeenCalledWith(req, res, 'tickets', undefined);
    });
  });

  describe('checkServiceHealth', () => {
    it('should return healthy status for healthy service', async () => {
      req.params = { endPoint: 'users' };
      const healthStatus = { healthy: true, uptime: 12345, responseTime: 50 };
      routingService.checkServiceHealth.mockResolvedValue(healthStatus);

      await routingController.checkServiceHealth(req, res, next);

      expect(routingService.checkServiceHealth).toHaveBeenCalledWith('users');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Service is healthy',
        data: healthStatus
      });
    });

    it('should return unhealthy status for unhealthy service', async () => {
      req.params = { endPoint: 'payments' };
      const healthStatus = { healthy: false, error: 'Connection timeout' };
      routingService.checkServiceHealth.mockResolvedValue(healthStatus);

      await routingController.checkServiceHealth(req, res, next);

      expect(routingService.checkServiceHealth).toHaveBeenCalledWith('payments');
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Service is unhealthy',
        data: healthStatus
      });
    });

    it('should handle errors during health check', async () => {
      req.params = { endPoint: 'transport' };
      const error = new Error('Health check failed');
      routingService.checkServiceHealth.mockRejectedValue(error);

      await routingController.checkServiceHealth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Health check failed',
        error: 'HEALTH_CHECK_ERROR'
      });
    });
  });
}); 