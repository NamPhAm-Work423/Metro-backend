const express = require('express');
const CacheController = require('../controllers/cache.controller');

const router = express.Router();
const cacheController = new CacheController();

/**
 * Cache management routes
 */

// GET /cache/status - Get cache status
router.get('/status', cacheController.getCacheStatus.bind(cacheController));

// GET /cache/stats - Get cache statistics
router.get('/stats', cacheController.getCacheStats.bind(cacheController));

// POST /cache/refresh - Manually trigger cache refresh
router.post('/refresh', cacheController.refreshCache.bind(cacheController));

// DELETE /cache/clear - Clear all cached data
router.delete('/clear', cacheController.clearCache.bind(cacheController));

// GET /cache/health - Check cache health
router.get('/health', cacheController.getCacheHealth.bind(cacheController));

// GET /cache/metadata - Get cache metadata
router.get('/metadata', cacheController.getCacheMetadata.bind(cacheController));

// GET /cache/scheduler - Get scheduler status
router.get('/scheduler', cacheController.getSchedulerStatus.bind(cacheController));

// POST /cache/scheduler/control - Control scheduler (start/stop)
router.post('/scheduler/control', cacheController.controlScheduler.bind(cacheController));

// POST /cache/reset-stats - Reset cache statistics
router.post('/reset-stats', cacheController.resetCacheStats.bind(cacheController));

module.exports = router; 