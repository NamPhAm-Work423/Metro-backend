const authController = require('../../../src/controllers/auth.controller');
const keyService = require('../../../src/services/key.service');

// Mock key service
jest.mock('../../../src/services/key.service');

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

// Mock CustomError
jest.mock('../../../src/utils/CustomError', () => {
  return jest.fn().mockImplementation((message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  });
});

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('generateAPIToken', () => {
    it('should generate API token successfully', async () => {
      const mockResult = {
        token: 'test-api-token-123',
        keyId: 'key-id-456'
      };
      req.params.id = 'user-123';
      keyService.generateAPIKeyForUser.mockResolvedValue(mockResult);

      await authController.generateAPIToken(req, res, next);

      expect(keyService.generateAPIKeyForUser).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        token: 'test-api-token-123',
        message: 'API key generated successfully. Use this key in x-api-key header for routing endpoints.'
      });
    });

    it('should handle errors when generating API token', async () => {
      req.params.id = 'user-123';
      const error = new Error('Database error');
      keyService.generateAPIKeyForUser.mockRejectedValue(error);

      await authController.generateAPIToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getAPIKeyByUser', () => {
    it('should get API keys for user successfully', async () => {
      const mockKeys = [
        { id: 'key1', token: 'token1' },
        { id: 'key2', token: 'token2' }
      ];
      req.params.userId = 'user-123';
      keyService.getAPIKeysByUserId.mockResolvedValue(mockKeys);

      await authController.getAPIKeyByUser(req, res, next);

      expect(keyService.getAPIKeysByUserId).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockKeys
      });
    });

    it('should return 400 when user ID is missing', async () => {
      req.params = {};

      await authController.getAPIKeyByUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User ID is required'
      });
    });

    it('should handle errors when getting API keys', async () => {
      req.params.userId = 'user-123';
      const error = new Error('Database error');
      keyService.getAPIKeysByUserId.mockRejectedValue(error);

      await authController.getAPIKeyByUser(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('deleteKeyById', () => {
    it('should delete API key successfully', async () => {
      req.params.id = 'key-123';
      keyService.deleteAPIKeyById.mockResolvedValue(true);

      await authController.deleteKeyById(req, res, next);

      expect(keyService.deleteAPIKeyById).toHaveBeenCalledWith('key-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'API key deleted successfully'
      });
    });

    it('should return 404 when API key not found', async () => {
      req.params.id = 'key-999';
      keyService.deleteAPIKeyById.mockResolvedValue(null);

      await authController.deleteKeyById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No API keys found'
      });
    });

    it('should handle errors when deleting API key', async () => {
      req.params.id = 'key-123';
      const error = new Error('Database error');
      keyService.deleteAPIKeyById.mockRejectedValue(error);

      await authController.deleteKeyById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
}); 