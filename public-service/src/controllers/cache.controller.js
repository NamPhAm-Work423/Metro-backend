const { logger } = require('../config/logger');
const CacheService = require('../services/cache.service');
const SchedulerService = require('../services/scheduler.service');

class CacheController {
    constructor() {
        this.cacheService = new CacheService();
        this.schedulerService = new SchedulerService();
    }

    /**
     * Get cache status and statistics
     * GET /v1/cache/status
     */
    async getCacheStatus(req, res) {
        try {
            logger.info('Request for cache status', { 
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const cacheStatus = await this.cacheService.getCacheStatus();
            const schedulerStatus = this.schedulerService.getStatus();

            res.json({
                success: true,
                cache: cacheStatus,
                scheduler: schedulerStatus,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error fetching cache status', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching cache status',
                error: error.message
            });
        }
    }

    /**
     * Get cache statistics
     * GET /v1/cache/stats
     */
    async getCacheStats(req, res) {
        try {
            logger.info('Request for cache statistics', { 
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const cacheStatus = await this.cacheService.getCacheStatus();
            const schedulerStats = this.schedulerService.getStats();

            res.json({
                success: true,
                data: {
                    cache: cacheStatus,
                    scheduler: schedulerStats
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error fetching cache statistics', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching cache statistics',
                error: error.message
            });
        }
    }

    /**
     * Manually trigger cache refresh
     * POST /v1/cache/refresh
     */
    async refreshCache(req, res) {
        try {
            const { force = false } = req.body;

            logger.info('Manual cache refresh requested', { 
                force,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            // Check if refresh is already in progress
            const schedulerStatus = this.schedulerService.getStatus();
            if (schedulerStatus.running && !force) {
                return res.status(409).json({
                    success: false,
                    message: 'Cache refresh already in progress',
                    tip: 'Use force=true to override',
                    currentStatus: schedulerStatus
                });
            }

            // Trigger manual refresh
            const refreshResult = await this.schedulerService.triggerManualRefresh();

            if (refreshResult.success) {
                res.json({
                    success: true,
                    message: 'Cache refresh completed successfully',
                    data: refreshResult,
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Cache refresh failed',
                    error: refreshResult.error,
                    data: refreshResult,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            logger.error('Error during manual cache refresh', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error during cache refresh',
                error: error.message
            });
        }
    }

    /**
     * Clear all cached data
     * DELETE /v1/cache/clear
     */
    async clearCache(req, res) {
        try {
            logger.info('Cache clear requested', { 
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const cleared = await this.cacheService.clearCache();

            if (cleared.success) {
                res.json({
                    success: true,
                    message: 'Cache cleared successfully',
                    timestamp: new Date().toISOString()
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to clear cache',
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            logger.error('Error clearing cache', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while clearing cache',
                error: error.message
            });
        }
    }

    /**
     * Reset cache statistics
     * POST /v1/cache/reset-stats
     */
    async resetCacheStats(req, res) {
        try {
            logger.info('Cache stats reset requested', { 
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            this.schedulerService.resetStats();

            res.json({
                success: true,
                message: 'Cache statistics reset successfully',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error resetting cache statistics', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while resetting cache statistics',
                error: error.message
            });
        }
    }

    /**
     * Get cache metadata
     * GET /v1/cache/metadata
     */
    async getCacheMetadata(req, res) {
        try {
            logger.info('Request for cache metadata', { 
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const cacheStatus = await this.cacheService.getCacheStatus();
            const dataAvailability = await this.cacheService.checkDataAvailability();

            const metadata = {
                cacheStatus,
                dataAvailability,
                lastUpdate: cacheStatus.lastUpdate,
                cacheTTL: cacheStatus.cacheTTL,
                keys: cacheStatus.keys
            };

            res.json({
                success: true,
                data: metadata,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error fetching cache metadata', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching cache metadata',
                error: error.message
            });
        }
    }

    /**
     * Get scheduler status
     * GET /v1/cache/scheduler
     */
    async getSchedulerStatus(req, res) {
        try {
            logger.info('Request for scheduler status', { 
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const status = this.schedulerService.getStatus();
            const healthCheck = this.schedulerService.healthCheck();

            res.json({
                success: true,
                data: {
                    status,
                    health: healthCheck,
                    description: this.schedulerService.getScheduleDescription()
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error fetching scheduler status', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching scheduler status',
                error: error.message
            });
        }
    }

    /**
     * Control scheduler (start/stop)
     * POST /v1/cache/scheduler/control
     */
    async controlScheduler(req, res) {
        try {
            const { action } = req.body;

            if (!action || !['start', 'stop'].includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action. Must be "start" or "stop"',
                    provided: action
                });
            }

            logger.info('Scheduler control requested', { 
                action,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            if (action === 'start') {
                this.schedulerService.start();
                res.json({
                    success: true,
                    message: 'Scheduler started successfully',
                    action,
                    timestamp: new Date().toISOString()
                });
            } else if (action === 'stop') {
                this.schedulerService.stop();
                res.json({
                    success: true,
                    message: 'Scheduler stopped successfully',
                    action,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            logger.error('Error controlling scheduler', { 
                action: req.body.action,
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while controlling scheduler',
                error: error.message
            });
        }
    }

    /**
     * Get cache health check
     * GET /v1/cache/health
     */
    async getCacheHealth(req, res) {
        try {
            const cacheStatus = await this.cacheService.getCacheStatus();
            const schedulerHealth = this.schedulerService.healthCheck();
            const dataAvailability = await this.cacheService.checkDataAvailability();

            const overallHealth = {
                healthy: cacheStatus.healthy && schedulerHealth.healthy && dataAvailability.healthy,
                components: {
                    redis: {
                        healthy: cacheStatus.healthy,
                        status: cacheStatus.healthy ? 'connected' : 'disconnected'
                    },
                    scheduler: {
                        healthy: schedulerHealth.healthy,
                        status: schedulerHealth.enabled ? 'enabled' : 'disabled',
                        message: schedulerHealth.message
                    },
                    dataFreshness: {
                        healthy: dataAvailability.healthy,
                        transport: dataAvailability.transport,
                        ticket: dataAvailability.ticket,
                        lastUpdate: cacheStatus.lastUpdate
                    }
                },
                timestamp: new Date().toISOString()
            };

            const statusCode = overallHealth.healthy ? 200 : 503;

            res.status(statusCode).json({
                success: overallHealth.healthy,
                data: overallHealth,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error during cache health check', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(503).json({
                success: false,
                message: 'Cache health check failed',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = CacheController; 