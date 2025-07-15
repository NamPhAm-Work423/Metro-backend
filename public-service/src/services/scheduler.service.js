const cron = require('node-cron');
const { logger } = require('../config/logger');
const CacheService = require('./cache.service');

class SchedulerService {
    constructor() {
        this.cacheService = new CacheService();
        this.cronJob = null;
        this.isRunning = false;
        this.enabled = true;
        this.interval = '0 * * * *'; // Every hour
        this.initialDelayMs = 10000; // 10 seconds
        
        // Track scheduler statistics
        this.stats = {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            lastRun: null,
            lastSuccess: null,
            lastError: null,
            startedAt: null,
            averageDuration: 0,
            durations: []
        };
    }

    /**
     * Initialize and start the scheduler
     */
    async initialize() {
        logger.info('Initializing scheduler service', {
            enabled: this.enabled,
            interval: this.interval,
            initialDelayMs: this.initialDelayMs
        });

        if (!this.enabled) {
            logger.info('Scheduler is disabled by configuration');
            return;
        }

        try {
            // Schedule initial data fetch after delay
            setTimeout(async () => {
                logger.info('Running initial data fetch');
                await this.runCacheRefresh('initial');
            }, this.initialDelayMs);

            // Set up recurring cron job
            this.setupCronJob();
            
            this.stats.startedAt = new Date().toISOString();
            logger.info('Scheduler service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize scheduler service', { error: error.message });
            throw error;
        }
    }

    /**
     * Setup the cron job for regular data fetching
     */
    setupCronJob() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }

        logger.info('Setting up cron job', { interval: this.interval });

        this.cronJob = cron.schedule(this.interval, async () => {
            logger.info('Cron job triggered - starting scheduled cache refresh');
            await this.runCacheRefresh('scheduled');
        }, {
            scheduled: false, // Don't start immediately
            timezone: 'Asia/Ho_Chi_Minh' // Vietnam timezone
        });

        this.cronJob.start();
        logger.info('Cron job started successfully');
    }

    /**
     * Run cache refresh operation
     */
    async runCacheRefresh(trigger = 'manual') {
        if (this.isRunning) {
            logger.warn('Cache refresh already in progress, skipping', { trigger });
            return {
                success: false,
                message: 'Cache refresh already in progress',
                trigger
            };
        }

        this.isRunning = true;
        const startTime = Date.now();

        logger.info('Starting cache refresh', { 
            trigger,
            timestamp: new Date().toISOString()
        });

        try {
            // Update statistics
            this.stats.totalRuns++;
            this.stats.lastRun = new Date().toISOString();

            // Run the cache refresh
            const results = await this.cacheService.cacheAllData();
            const duration = Date.now() - startTime;

            // Update duration statistics
            this.stats.durations.push(duration);
            if (this.stats.durations.length > 10) {
                this.stats.durations.shift(); // Keep only last 10 durations
            }
            this.stats.averageDuration = this.stats.durations.reduce((a, b) => a + b, 0) / this.stats.durations.length;

            // Check if refresh was successful
            const success = results.transport && results.ticket && !results.error;

            if (success) {
                this.stats.successfulRuns++;
                this.stats.lastSuccess = new Date().toISOString();
                this.stats.lastError = null;

                logger.info('Cache refresh completed successfully', {
                    trigger,
                    duration: `${duration}ms`,
                    results,
                    stats: this.getStats()
                });

                return {
                    success: true,
                    duration,
                    results,
                    trigger,
                    timestamp: new Date().toISOString()
                };
            } else {
                throw new Error(`Cache refresh partially failed: ${JSON.stringify(results)}`);
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            this.stats.failedRuns++;
            this.stats.lastError = {
                message: error.message,
                timestamp: new Date().toISOString(),
                trigger
            };

            logger.error('Cache refresh failed', {
                trigger,
                duration: `${duration}ms`,
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                error: error.message,
                duration,
                trigger,
                timestamp: new Date().toISOString()
            };
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Manually trigger cache refresh
     */
    async triggerManualRefresh() {
        logger.info('Manual cache refresh triggered');
        return await this.runCacheRefresh('manual');
    }

    /**
     * Stop the scheduler
     */
    stop() {
        logger.info('Stopping scheduler service');

        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            logger.info('Cron job stopped');
        }

        this.enabled = false;
        logger.info('Scheduler service stopped');
    }

    /**
     * Start the scheduler (if it was stopped)
     */
    start() {
        logger.info('Starting scheduler service');

        if (!this.enabled) {
            this.enabled = true;
            this.setupCronJob();
            logger.info('Scheduler service started');
        } else {
            logger.warn('Scheduler service is already running');
        }
    }

    /**
     * Update scheduler interval
     */
    updateInterval(newInterval) {
        logger.info('Updating scheduler interval', { 
            oldInterval: this.interval, 
            newInterval 
        });

        this.interval = newInterval;
        
        if (this.enabled) {
            this.setupCronJob();
        }

        logger.info('Scheduler interval updated successfully');
    }

    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            enabled: this.enabled,
            running: this.isRunning,
            interval: this.interval,
            initialDelayMs: this.initialDelayMs,
            cronJobActive: this.cronJob ? true : false,
            nextRun: this.cronJob ? this.getNextRunTime() : null,
            stats: this.getStats(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get scheduler statistics
     */
    getStats() {
        const successRate = this.stats.totalRuns > 0 
            ? ((this.stats.successfulRuns / this.stats.totalRuns) * 100).toFixed(2)
            : 0;

        return {
            ...this.stats,
            successRate: `${successRate}%`,
            averageDurationMs: Math.round(this.stats.averageDuration),
            uptime: this.stats.startedAt 
                ? Math.round((Date.now() - new Date(this.stats.startedAt).getTime()) / 1000)
                : 0
        };
    }

    /**
     * Get next scheduled run time
     */
    getNextRunTime() {
        if (!this.cronJob) {
            return null;
        }

        try {
            // This is a simplified calculation - node-cron doesn't expose next run time directly
            // For a more accurate implementation, you might want to use a library like 'cron-parser'
            const now = new Date();
            const nextHour = new Date(now);
            nextHour.setHours(nextHour.getHours() + 1);
            nextHour.setMinutes(0, 0, 0);
            
            return nextHour.toISOString();
        } catch (error) {
            logger.error('Failed to calculate next run time', { error: error.message });
            return null;
        }
    }

    /**
     * Reset scheduler statistics
     */
    resetStats() {
        this.stats = {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            lastRun: null,
            lastSuccess: null,
            lastError: null,
            startedAt: this.stats.startedAt, // Keep the original start time
            averageDuration: 0,
            durations: []
        };
        
        logger.info('Scheduler statistics reset');
    }

    /**
     * Validate cron expression
     */
    static validateCronExpression(expression) {
        try {
            const task = cron.schedule(expression, () => {}, { scheduled: false });
            task.destroy();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get human-readable schedule description
     */
    getScheduleDescription() {
        return 'Every hour';
    }

    /**
     * Health check for scheduler
     */
    healthCheck() {
        const now = Date.now();
        const lastRunTime = this.stats.lastRun ? new Date(this.stats.lastRun).getTime() : 0;
        const hoursSinceLastRun = (now - lastRunTime) / (1000 * 60 * 60);
        
        // Consider unhealthy if no run in more than 2 hours (allowing 1 hour buffer)
        const isHealthy = hoursSinceLastRun <= 2;
        
        return {
            healthy: isHealthy,
            enabled: this.enabled,
            running: this.isRunning,
            hoursSinceLastRun: hoursSinceLastRun.toFixed(2),
            lastRun: this.stats.lastRun,
            lastSuccess: this.stats.lastSuccess,
            lastError: this.stats.lastError,
            message: isHealthy 
                ? 'Scheduler is healthy' 
                : `Scheduler hasn't run in ${hoursSinceLastRun.toFixed(2)} hours`,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = SchedulerService; 