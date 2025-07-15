const CacheController = require('../../../src/controllers/cache.controller');

// Mock dependencies
jest.mock('../../../src/services/cache.service');
jest.mock('../../../src/services/scheduler.service');

const CacheService = require('../../../src/services/cache.service');
const SchedulerService = require('../../../src/services/scheduler.service');

describe('Cache Controller', () => {
  let cacheController;
  let req, res, next;
  let mockCacheService;
  let mockSchedulerService;

  beforeEach(() => {
    mockCacheService = {
      getCacheStatus: jest.fn(),
      clearCache: jest.fn(),
      checkDataAvailability: jest.fn()
    };
    mockSchedulerService = {
      getStatus: jest.fn(),
      getStats: jest.fn(),
      triggerManualRefresh: jest.fn(),
      healthCheck: jest.fn()
    };

    CacheService.mockImplementation(() => mockCacheService);
    SchedulerService.mockImplementation(() => mockSchedulerService);

    cacheController = new CacheController();
    req = {
      headers: {},
      ip: '127.0.0.1',
      query: {},
      get: jest.fn(),
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getCacheStats', () => {
    it('should return cache statistics successfully', async () => {
      const mockCacheStatus = {
        healthy: true,
        lastUpdate: '2024-01-01T00:00:00Z',
        keys: { transport: 10, ticket: 5 }
      };
      const mockSchedulerStats = {
        totalRuns: 5,
        successfulRuns: 5,
        failedRuns: 0
      };
      mockCacheService.getCacheStatus.mockResolvedValue(mockCacheStatus);
      mockSchedulerService.getStats.mockReturnValue(mockSchedulerStats);

      await cacheController.getCacheStats(req, res);

      expect(mockCacheService.getCacheStatus).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            cache: mockCacheStatus,
            scheduler: mockSchedulerStats
          }
        })
      );
    });

    it('should handle errors when getting cache stats', async () => {
      const error = new Error('Cache stats error');
      mockCacheService.getCacheStatus.mockRejectedValue(error);

      await cacheController.getCacheStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal server error while fetching cache statistics'
        })
      );
    });
  });

  describe('refreshCache', () => {
    it('should refresh cache successfully', async () => {
      const mockRefreshResult = {
        success: true,
        transport: true,
        ticket: true
      };
      mockSchedulerService.getStatus.mockReturnValue({ running: false });
      mockSchedulerService.triggerManualRefresh.mockResolvedValue(mockRefreshResult);

      await cacheController.refreshCache(req, res);

      expect(mockSchedulerService.triggerManualRefresh).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Cache refresh completed successfully'
        })
      );
    });

    it('should prevent concurrent cache refresh', async () => {
      mockSchedulerService.getStatus.mockReturnValue({ running: true });

      await cacheController.refreshCache(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Cache refresh already in progress'
        })
      );
    });

    it('should handle cache refresh failure', async () => {
      const mockRefreshResult = {
        success: false,
        error: 'Refresh failed'
      };
      mockSchedulerService.getStatus.mockReturnValue({ running: false });
      mockSchedulerService.triggerManualRefresh.mockResolvedValue(mockRefreshResult);

      await cacheController.refreshCache(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Cache refresh failed'
        })
      );
    });
  });

  describe('clearCache', () => {
    it('should clear cache successfully', async () => {
      mockCacheService.clearCache.mockResolvedValue({ success: true });

      await cacheController.clearCache(req, res);

      expect(mockCacheService.clearCache).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Cache cleared successfully'
        })
      );
    });

    it('should handle cache clear failure', async () => {
      const error = new Error('Clear cache error');
      mockCacheService.clearCache.mockRejectedValue(error);

      await cacheController.clearCache(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal server error while clearing cache'
        })
      );
    });
  });

  describe('getCacheHealth', () => {
    it('should return cache health status', async () => {
      const mockCacheStatus = {
        healthy: true,
        lastUpdate: '2024-01-01T00:00:00Z'
      };
      const mockSchedulerHealth = {
        healthy: true,
        enabled: true,
        message: 'Running'
      };
      const mockDataAvailability = {
        healthy: true,
        transport: true,
        ticket: true
      };
      
      mockCacheService.getCacheStatus.mockResolvedValue(mockCacheStatus);
      mockSchedulerService.healthCheck.mockReturnValue(mockSchedulerHealth);
      mockCacheService.checkDataAvailability.mockResolvedValue(mockDataAvailability);

      await cacheController.getCacheHealth(req, res);

      expect(mockCacheService.getCacheStatus).toHaveBeenCalled();
      expect(mockSchedulerService.healthCheck).toHaveBeenCalled();
      expect(mockCacheService.checkDataAvailability).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            healthy: true,
            components: expect.any(Object)
          })
        })
      );
    });
  });
}); 