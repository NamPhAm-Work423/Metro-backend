const PassengerCacheService = require('../../../src/services/cache/PassengerCacheService');

describe('PassengerCacheService', () => {
  let mockRedis;
  let mockLogger;
  let cacheService;

  beforeEach(() => {
    mockRedis = {
      multi: jest.fn().mockReturnThis(),
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      exec: jest.fn().mockResolvedValue([[null, 'OK']])
    };

    mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    cacheService = new PassengerCacheService(mockRedis, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with default values', () => {
      const service = new PassengerCacheService(mockRedis, mockLogger);
      expect(service.keyPrefix).toBe('metrohcm:user-service:user:passenger:');
      expect(service.defaultTTL).toBe(900);
    });

    test('initializes with custom values', () => {
      const service = new PassengerCacheService(mockRedis, mockLogger, 'custom:', 7200);
      expect(service.keyPrefix).toBe('custom:');
      expect(service.defaultTTL).toBe(7200);
    });
  });

  describe('_getCacheKey', () => {
    test('generates correct cache key', () => {
      const key = cacheService._getCacheKey('passenger123');
      expect(key).toBe('metrohcm:user-service:user:passenger:passenger123');
    });
  });

  describe('_getIndexKey', () => {
    test('generates correct index key', () => {
      const key = cacheService._getIndexKey('user123');
      expect(key).toBe('metrohcm:user-service:user:passenger:index:user123');
    });
  });

  describe('_getEmailIndexKey', () => {
    test('generates correct email index key', () => {
      const key = cacheService._getEmailIndexKey('test@example.com');
      expect(key).toBe('metrohcm:user-service:user:passenger:emailIndex:test@example.com');
    });
  });

  describe('setPassenger', () => {
    test('sets passenger data successfully', async () => {
      const passengerData = {
        passengerId: 'p123',
        userId: 'u123',
        email: 'test@example.com',
        firstName: 'John'
      };

      await cacheService.setPassenger(passengerData);

      expect(mockRedis.multi).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledTimes(3); // main key, index key, email index key
      expect(mockRedis.exec).toHaveBeenCalled();
    });

    test('sets passenger data without email', async () => {
      const passengerData = {
        passengerId: 'p123',
        userId: 'u123',
        firstName: 'John'
      };

      await cacheService.setPassenger(passengerData);

      expect(mockRedis.set).toHaveBeenCalledTimes(2); // main key, index key only
    });

    test('logs warning when passengerId is missing', async () => {
      const passengerData = { userId: 'u123' };

      await cacheService.setPassenger(passengerData);

      expect(mockLogger.warn).toHaveBeenCalledWith('Missing passengerId or userId when setting passenger to cache.');
      expect(mockRedis.multi).not.toHaveBeenCalled();
    });

    test('logs warning when userId is missing', async () => {
      const passengerData = { passengerId: 'p123' };

      await cacheService.setPassenger(passengerData);

      expect(mockLogger.warn).toHaveBeenCalledWith('Missing passengerId or userId when setting passenger to cache.');
      expect(mockRedis.multi).not.toHaveBeenCalled();
    });

    test('handles redis errors gracefully', async () => {
      const passengerData = {
        passengerId: 'p123',
        userId: 'u123'
      };

      mockRedis.exec.mockRejectedValue(new Error('Redis error'));

      await cacheService.setPassenger(passengerData);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to set passenger cache', { err: expect.any(Error) });
    });
  });

  describe('getPassenger', () => {
    test('returns passenger data when found', async () => {
      const passengerData = { passengerId: 'p123', firstName: 'John' };
      const cachedData = {
        data: passengerData,
        cachedAt: new Date().toISOString()
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await cacheService.getPassenger('p123');

      expect(mockRedis.get).toHaveBeenCalledWith('metrohcm:user-service:user:passenger:p123');
      expect(result).toEqual(passengerData);
    });

    test('returns null when not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.getPassenger('p123');

      expect(result).toBeNull();
    });

    test('handles parse errors gracefully', async () => {
      mockRedis.get.mockResolvedValue('invalid json');

      const result = await cacheService.getPassenger('p123');

      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to get/parse passenger cache', {
        passengerId: 'p123',
        error: expect.any(String)
      });
      expect(result).toBeNull();
    });

    test('handles redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.getPassenger('p123');

      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to get/parse passenger cache', {
        passengerId: 'p123',
        error: 'Redis error'
      });
      expect(result).toBeNull();
    });
  });

  describe('getPassengerByUserId', () => {
    test('returns passenger data when found', async () => {
      const passengerData = { passengerId: 'p123', firstName: 'John' };
      const cachedData = {
        data: passengerData,
        cachedAt: new Date().toISOString()
      };

      mockRedis.get
        .mockResolvedValueOnce('p123') // index lookup
        .mockResolvedValueOnce(JSON.stringify(cachedData)); // passenger data

      const result = await cacheService.getPassengerByUserId('u123');

      expect(mockRedis.get).toHaveBeenCalledWith('metrohcm:user-service:user:passenger:index:u123');
      expect(result).toEqual(passengerData);
    });

    test('returns null when index not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.getPassengerByUserId('u123');

      expect(result).toBeNull();
    });

    test('handles redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.getPassengerByUserId('u123');

      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to get passenger by userId', {
        userId: 'u123',
        error: 'Redis error'
      });
      expect(result).toBeNull();
    });
  });

  describe('getPassengerByEmail', () => {
    test('returns passenger data when found', async () => {
      const passengerData = { passengerId: 'p123', firstName: 'John' };
      const cachedData = {
        data: passengerData,
        cachedAt: new Date().toISOString()
      };

      mockRedis.get
        .mockResolvedValueOnce('p123') // email index lookup
        .mockResolvedValueOnce(JSON.stringify(cachedData)); // passenger data

      const result = await cacheService.getPassengerByEmail('test@example.com');

      expect(mockRedis.get).toHaveBeenCalledWith('metrohcm:user-service:user:passenger:emailIndex:test@example.com');
      expect(result).toEqual(passengerData);
    });

    test('returns null when email index not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.getPassengerByEmail('test@example.com');

      expect(result).toBeNull();
    });

    test('handles redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.getPassengerByEmail('test@example.com');

      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to get passenger by email', {
        email: 'test@example.com',
        error: 'Redis error'
      });
      expect(result).toBeNull();
    });
  });

  describe('hasPassenger', () => {
    test('returns true when passenger exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await cacheService.hasPassenger('p123');

      expect(mockRedis.exists).toHaveBeenCalledWith('metrohcm:user-service:user:passenger:p123');
      expect(result).toBe(true);
    });

    test('returns false when passenger does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await cacheService.hasPassenger('p123');

      expect(result).toBe(false);
    });

    test('handles redis errors gracefully', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.hasPassenger('p123');

      expect(mockLogger.error).toHaveBeenCalledWith('Error checking passenger existence in cache', {
        passengerId: 'p123',
        error: 'Redis error'
      });
      expect(result).toBe(false);
    });
  });

  describe('removePassenger', () => {
    test('removes passenger data successfully', async () => {
      mockRedis.del.mockResolvedValue(3);

      const result = await cacheService.removePassenger('p123', 'u123', 'test@example.com');

      expect(mockRedis.del).toHaveBeenCalledWith(
        'metrohcm:user-service:user:passenger:p123',
        'metrohcm:user-service:user:passenger:index:u123',
        'metrohcm:user-service:user:passenger:emailIndex:test@example.com'
      );
      expect(result).toBe(true);
    });

    test('removes passenger data without email', async () => {
      mockRedis.del.mockResolvedValue(2);

      const result = await cacheService.removePassenger('p123', 'u123');

      expect(mockRedis.del).toHaveBeenCalledWith(
        'metrohcm:user-service:user:passenger:p123',
        'metrohcm:user-service:user:passenger:index:u123'
      );
      expect(result).toBe(true);
    });

    test('returns false when no keys deleted', async () => {
      mockRedis.del.mockResolvedValue(0);

      const result = await cacheService.removePassenger('p123', 'u123');

      expect(result).toBe(false);
    });

    test('handles redis errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.removePassenger('p123', 'u123');

      expect(mockLogger.error).toHaveBeenCalledWith('Error removing passenger cache', {
        passengerId: 'p123',
        userId: 'u123',
        error: 'Redis error'
      });
      expect(result).toBe(false);
    });
  });

  describe('refreshPassengerTTL', () => {
    test('refreshes TTL successfully', async () => {
      mockRedis.expire.mockResolvedValue(1);

      const result = await cacheService.refreshPassengerTTL('p123', 'u123');

      expect(mockRedis.expire).toHaveBeenCalledWith('metrohcm:user-service:user:passenger:p123', 900);
      expect(mockRedis.expire).toHaveBeenCalledWith('metrohcm:user-service:user:passenger:index:u123', 900);
      expect(result).toBe(true);
    });

    test('refreshes TTL with custom value', async () => {
      mockRedis.expire.mockResolvedValue(1);

      const result = await cacheService.refreshPassengerTTL('p123', 'u123', 7200);

      expect(mockRedis.expire).toHaveBeenCalledWith('metrohcm:user-service:user:passenger:p123', 7200);
      expect(mockRedis.expire).toHaveBeenCalledWith('metrohcm:user-service:user:passenger:index:u123', 7200);
      expect(result).toBe(true);
    });

    test('refreshes TTL without userId', async () => {
      mockRedis.expire.mockResolvedValue(1);

      const result = await cacheService.refreshPassengerTTL('p123');

      expect(mockRedis.expire).toHaveBeenCalledWith('metrohcm:user-service:user:passenger:p123', 900);
      expect(mockRedis.expire).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    test('returns false when no TTL refreshed', async () => {
      mockRedis.expire.mockResolvedValue(0);

      const result = await cacheService.refreshPassengerTTL('p123', 'u123');

      expect(result).toBe(false);
    });

    test('handles redis errors gracefully', async () => {
      mockRedis.expire.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.refreshPassengerTTL('p123', 'u123');

      expect(mockLogger.error).toHaveBeenCalledWith('Error refreshing TTL', {
        passengerId: 'p123',
        userId: 'u123',
        error: 'Redis error'
      });
      expect(result).toBe(false);
    });
  });

  describe('setPassengers', () => {
    test('sets multiple passengers successfully', async () => {
      const passengerMap = {
        'p1': { userId: 'u1', email: 'test1@example.com' },
        'p2': { userId: 'u2', email: 'test2@example.com' }
      };

      const result = await cacheService.setPassengers(passengerMap);

      expect(mockRedis.multi).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledTimes(6); // 2 passengers * 3 keys each
      expect(mockRedis.exec).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('skips passengers without userId', async () => {
      const passengerMap = {
        'p1': { userId: 'u1', email: 'test1@example.com' },
        'p2': { email: 'test2@example.com' } // no userId
      };

      const result = await cacheService.setPassengers(passengerMap);

      expect(mockRedis.set).toHaveBeenCalledTimes(3); // only p1 gets 3 keys
      expect(result).toBe(true);
    });

    test('handles empty passenger map', async () => {
      const result = await cacheService.setPassengers({});

      expect(mockRedis.multi).toHaveBeenCalled();
      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('handles redis errors gracefully', async () => {
      const passengerMap = {
        'p1': { userId: 'u1' }
      };

      mockRedis.exec.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.setPassengers(passengerMap);

      expect(mockLogger.error).toHaveBeenCalledWith('Error in batch setPassengers', {
        error: 'Redis error'
      });
      expect(result).toBe(false);
    });
  });

  describe('setPassenger edge cases', () => {
    test('logs error when redis client is null', async () => {
      const serviceWithNullRedis = new PassengerCacheService(null, mockLogger);
      const passengerData = {
        passengerId: 'p123',
        userId: 'u123',
        email: 'test@example.com'
      };

      await serviceWithNullRedis.setPassenger(passengerData);

      expect(mockLogger.error).toHaveBeenCalledWith('Redis client is null - cannot set passenger cache', {
        passengerId: 'p123',
        userId: 'u123'
      });
    });

    test('skips setting when passenger already exists and forceRefresh is false', async () => {
      const passengerData = {
        passengerId: 'p123',
        userId: 'u123',
        email: 'test@example.com'
      };

      // Mock hasPassenger to return true (passenger exists)
      jest.spyOn(cacheService, 'hasPassenger').mockResolvedValue(true);

      await cacheService.setPassenger(passengerData, false);

      expect(mockLogger.debug).toHaveBeenCalledWith('Passenger already exists in cache, skipping set', {
        passengerId: 'p123',
        userId: 'u123'
      });
      expect(mockRedis.multi).not.toHaveBeenCalled();
    });

    test('forces refresh when forceRefresh is true even if passenger exists', async () => {
      const passengerData = {
        passengerId: 'p123',
        userId: 'u123',
        email: 'test@example.com'
      };

      // Mock hasPassenger to return true (passenger exists)
      jest.spyOn(cacheService, 'hasPassenger').mockResolvedValue(true);

      await cacheService.setPassenger(passengerData, true);

      expect(mockRedis.multi).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledTimes(3);
    });
  });
});
