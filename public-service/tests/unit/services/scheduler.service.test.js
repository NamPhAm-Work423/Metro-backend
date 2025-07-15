const SchedulerService = require('../../../src/services/scheduler.service');

// Mock dependencies
jest.mock('../../../src/services/cache.service');
jest.mock('node-cron');

const CacheService = require('../../../src/services/cache.service');
const cron = require('node-cron');

describe('Scheduler Service', () => {
  let schedulerService;
  let mockCacheService;
  let mockCronJob;

  beforeEach(() => {
    mockCacheService = {
      cacheAllData: jest.fn()
    };
    mockCronJob = {
      start: jest.fn(),
      stop: jest.fn()
    };

    CacheService.mockImplementation(() => mockCacheService);
    cron.schedule.mockReturnValue(mockCronJob);

    // Mock environment variables
    process.env.SCHEDULER_ENABLED = 'true';
    process.env.SCHEDULER_CRON = '0 * * * *';

    schedulerService = new SchedulerService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('initialize', () => {
    it('should initialize scheduler when enabled', async () => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setTimeout');
      
      mockCacheService.cacheAllData.mockResolvedValue({
        transport: true,
        ticket: true
      });

      // Just call initialize - don't wait for the setTimeout
      schedulerService.initialize();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 * * * *',
        expect.any(Function),
        expect.objectContaining({
          scheduled: false,
          timezone: 'Asia/Ho_Chi_Minh'
        })
      );
      expect(mockCronJob.start).toHaveBeenCalled();

      // Test the setTimeout callback separately
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 10000);
      
      // Trigger the setTimeout callback manually
      const timeoutCallback = setTimeout.mock.calls[0][0];
      await timeoutCallback();
      
      expect(mockCacheService.cacheAllData).toHaveBeenCalled();
    });

    it('should not initialize scheduler when disabled', async () => {
      schedulerService.enabled = false;

      await schedulerService.initialize();

      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });

  describe('runCacheRefresh', () => {
    it('should successfully refresh cache', async () => {
      const mockResults = {
        transport: true,
        ticket: true,
        error: null
      };
      mockCacheService.cacheAllData.mockResolvedValue(mockResults);

      const result = await schedulerService.runCacheRefresh('manual');

      expect(mockCacheService.cacheAllData).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.results).toEqual(mockResults);
      expect(result.trigger).toBe('manual');
      expect(schedulerService.stats.totalRuns).toBe(1);
      expect(schedulerService.stats.successfulRuns).toBe(1);
    });

    it('should handle partial cache refresh failure', async () => {
      const mockResults = {
        transport: true,
        ticket: false,
        error: 'Ticket service unavailable'
      };
      mockCacheService.cacheAllData.mockResolvedValue(mockResults);

      const result = await schedulerService.runCacheRefresh('scheduled');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cache refresh partially failed');
      expect(schedulerService.stats.failedRuns).toBe(1);
    });

    it('should prevent concurrent cache refresh', async () => {
      schedulerService.isRunning = true;

      const result = await schedulerService.runCacheRefresh('manual');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cache refresh already in progress');
      expect(mockCacheService.cacheAllData).not.toHaveBeenCalled();
    });

    it('should handle cache service errors', async () => {
      const error = new Error('Cache service error');
      mockCacheService.cacheAllData.mockRejectedValue(error);

      const result = await schedulerService.runCacheRefresh('manual');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cache service error');
      expect(schedulerService.stats.failedRuns).toBe(1);
    });
  });

  describe('triggerManualRefresh', () => {
    it('should trigger manual cache refresh', async () => {
      const mockResults = {
        transport: true,
        ticket: true,
        error: null
      };
      mockCacheService.cacheAllData.mockResolvedValue(mockResults);

      const result = await schedulerService.triggerManualRefresh();

      expect(result.trigger).toBe('manual');
      expect(result.success).toBe(true);
    });
  });

  describe('stop', () => {
    it('should stop the scheduler', () => {
      schedulerService.cronJob = mockCronJob;

      schedulerService.stop();

      expect(mockCronJob.stop).toHaveBeenCalled();
      expect(schedulerService.enabled).toBe(false);
    });

    it('should handle stopping when no cron job exists', () => {
      schedulerService.cronJob = null;

      expect(() => schedulerService.stop()).not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return scheduler statistics', () => {
      schedulerService.stats.totalRuns = 5;
      schedulerService.stats.successfulRuns = 4;
      schedulerService.stats.failedRuns = 1;

      const stats = schedulerService.getStats();

      expect(stats).toEqual(
        expect.objectContaining({
          totalRuns: 5,
          successfulRuns: 4,
          failedRuns: 1,
          successRate: '80.00%'
        })
      );
    });
  });

  describe('getStatus', () => {
    it('should return scheduler status', () => {
      const status = schedulerService.getStatus();

      expect(status).toEqual(
        expect.objectContaining({
          enabled: expect.any(Boolean),
          running: expect.any(Boolean),
          interval: expect.any(String)
        })
      );
    });
  });
}); 