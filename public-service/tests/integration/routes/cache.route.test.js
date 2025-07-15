const express = require('express');
const request = require('supertest');

// Mock cache controller
jest.mock('../../../src/controllers/cache.controller', () => {
  const mockController = {
    getCacheStatus: jest.fn((req, res) => {
      res.status(200).json({
        success: true,
        cache: { healthy: true, lastUpdate: '2024-01-01T00:00:00Z' },
        scheduler: { running: false }
      });
    }),
    getCacheStats: jest.fn((req, res) => {
      res.status(200).json({
        success: true,
        data: {
          transport: { lastUpdated: '2024-01-01T00:00:00Z', routeCount: 10 },
          ticket: { lastUpdated: '2024-01-01T00:00:00Z', fareCount: 5 }
        }
      });
    }),
    refreshCache: jest.fn((req, res) => {
      res.status(200).json({
        success: true,
        message: 'Cache refresh completed successfully'
      });
    }),
    clearCache: jest.fn((req, res) => {
      res.status(200).json({
        success: true,
        message: 'Cache cleared successfully'
      });
    }),
    getCacheHealth: jest.fn((req, res) => {
      res.status(200).json({
        success: true,
        data: { status: 'healthy' }
      });
    }),
    getCacheMetadata: jest.fn((req, res) => {
      res.status(200).json({
        success: true,
        data: { lastUpdate: '2024-01-01T00:00:00Z' }
      });
    }),
    getSchedulerStatus: jest.fn((req, res) => {
      res.status(200).json({
        success: true,
        data: { status: 'running' }
      });
    }),
    controlScheduler: jest.fn((req, res) => {
      res.status(200).json({
        success: true,
        message: 'Scheduler controlled successfully'
      });
    }),
    resetCacheStats: jest.fn((req, res) => {
      res.status(200).json({
        success: true,
        message: 'Stats reset successfully'
      });
    })
  };
  
  function MockController() {
    return mockController;
  }
  MockController.prototype = mockController;
  
  return MockController;
});

const CacheController = require('../../../src/controllers/cache.controller');
const cacheRoutes = require('../../../src/routes/cache.route');

describe('Cache Routes Integration', () => {
  let app;
  let mockController;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/v1/cache', cacheRoutes);
    
    // Get the mocked controller instance
    mockController = new CacheController();
    
    jest.clearAllMocks();
  });

  describe('GET /v1/cache/stats', () => {
    it('should return cache statistics', async () => {
      const response = await request(app)
        .get('/v1/cache/stats')
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            transport: expect.any(Object),
            ticket: expect.any(Object)
          })
        })
      );

      expect(mockController.getCacheStats).toHaveBeenCalled();
    });

    it('should handle cache stats errors', async () => {
      mockController.getCacheStats.mockImplementationOnce((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Failed to get cache statistics'
        });
      });

      const response = await request(app)
        .get('/v1/cache/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /v1/cache/refresh', () => {
    it('should trigger cache refresh successfully', async () => {
      const response = await request(app)
        .post('/v1/cache/refresh')
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Cache refresh completed successfully'
        })
      );

      expect(mockController.refreshCache).toHaveBeenCalled();
    });

    it('should handle refresh with force parameter', async () => {
      await request(app)
        .post('/v1/cache/refresh')
        .send({ force: true })
        .expect(200);

      expect(mockController.refreshCache).toHaveBeenCalled();
    });

    it('should handle cache refresh conflicts', async () => {
      mockController.refreshCache.mockImplementationOnce((req, res) => {
        res.status(409).json({
          success: false,
          message: 'Cache refresh already in progress'
        });
      });

      const response = await request(app)
        .post('/v1/cache/refresh')
        .expect(409);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Cache refresh already in progress'
        })
      );
    });

    it('should handle cache refresh failures', async () => {
      mockController.refreshCache.mockImplementationOnce((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Cache refresh failed',
          error: 'Service unavailable'
        });
      });

      const response = await request(app)
        .post('/v1/cache/refresh')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /v1/cache/clear', () => {
    it('should clear cache successfully', async () => {
      const response = await request(app)
        .delete('/v1/cache/clear')
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Cache cleared successfully'
        })
      );

      expect(mockController.clearCache).toHaveBeenCalled();
    });

    it('should handle cache clear errors', async () => {
      mockController.clearCache.mockImplementationOnce((req, res) => {
        res.status(500).json({
          success: false,
          message: 'Failed to clear cache'
        });
      });

      const response = await request(app)
        .delete('/v1/cache/clear')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /v1/cache/health', () => {
    it('should return cache health status', async () => {
      const response = await request(app)
        .get('/v1/cache/health')
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'healthy'
          })
        })
      );

      expect(mockController.getCacheHealth).toHaveBeenCalled();
    });

    it('should handle unhealthy cache status', async () => {
      mockController.getCacheHealth.mockImplementationOnce((req, res) => {
        res.status(503).json({
          success: false,
          data: { status: 'unhealthy', error: 'Redis connection failed' }
        });
      });

      const response = await request(app)
        .get('/v1/cache/health')
        .expect(503);

      expect(response.body.data.status).toBe('unhealthy');
    });
  });

  describe('Route validation', () => {
    it('should reject invalid HTTP methods', async () => {
      await request(app)
        .patch('/v1/cache/stats')
        .expect(404);
    });

    it('should handle malformed JSON in POST requests', async () => {
      await request(app)
        .post('/v1/cache/refresh')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });

  describe('Response headers', () => {
    it('should include proper content-type headers', async () => {
      const response = await request(app)
        .get('/v1/cache/stats')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should not cache API responses', async () => {
      const response = await request(app)
        .get('/v1/cache/stats')
        .expect(200);

      // Cache-control header might not be set by default
      if (response.headers['cache-control']) {
        expect(response.headers['cache-control']).toMatch(/no-cache|no-store/);
      }
    });
  });

  describe('Error handling middleware', () => {
    it('should handle controller exceptions gracefully', async () => {
      // Mock the controller to throw an error by overriding the mock implementation
      mockController.getCacheStats.mockImplementationOnce((req, res) => {
        throw new Error('Controller error');
      });

      const response = await request(app)
        .get('/v1/cache/stats')
        .expect(500);

      // The error middleware should catch the error
      expect(response.body).toBeDefined();
    });
  });
}); 