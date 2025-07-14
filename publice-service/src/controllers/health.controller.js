const { logger } = require('../config/logger');
const { config } = require('../config');
const redisConfig = require('../config/redis');
const TransportService = require('../services/transport.service');
const TicketService = require('../services/ticket.service');
const CacheService = require('../services/cache.service');
const SchedulerService = require('../services/scheduler.service');

class HealthController {
    constructor() {
        this.transportService = new TransportService();
        this.ticketService = new TicketService();
        this.cacheService = new CacheService();
        this.schedulerService = new SchedulerService();
        this.serviceStartTime = Date.now();
    }

    /**
     * Basic health check endpoint
     * GET /health
     */
    async getHealth(req, res) {
        try {
            const startTime = Date.now();

            // Basic checks
            const redisConnected = redisConfig.isRedisConnected();
            const uptime = Math.floor((Date.now() - this.serviceStartTime) / 1000);

            const health = {
                status: 'healthy',
                service: config.app.name,
                version: '1.0.0',
                environment: config.app.env,
                port: config.app.port,
                uptime: {
                    seconds: uptime,
                    human: this.formatUptime(uptime)
                },
                timestamp: new Date().toISOString(),
                checks: {
                    redis: {
                        status: redisConnected ? 'healthy' : 'unhealthy',
                        connected: redisConnected
                    }
                },
                responseTime: `${Date.now() - startTime}ms`
            };

            const statusCode = redisConnected ? 200 : 503;
            health.status = redisConnected ? 'healthy' : 'unhealthy';

            res.status(statusCode).json(health);

        } catch (error) {
            logger.error('Health check failed', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(503).json({
                status: 'unhealthy',
                service: config.app.name,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Comprehensive health check with all dependencies
     * GET /health/detailed
     */
    async getDetailedHealth(req, res) {
        try {
            const startTime = Date.now();
            
            logger.info('Detailed health check requested', { 
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            // Perform all health checks in parallel
            const [
                redisHealth,
                transportHealth,
                ticketHealth,
                cacheHealth,
                schedulerHealth
            ] = await Promise.allSettled([
                this.checkRedisHealth(),
                this.checkTransportServiceHealth(),
                this.checkTicketServiceHealth(),
                this.checkCacheHealth(),
                this.checkSchedulerHealth()
            ]);

            const uptime = Math.floor((Date.now() - this.serviceStartTime) / 1000);

            const health = {
                status: 'healthy', // Will be updated based on checks
                service: config.app.name,
                version: '1.0.0',
                environment: config.app.env,
                port: config.app.port,
                uptime: {
                    seconds: uptime,
                    human: this.formatUptime(uptime)
                },
                timestamp: new Date().toISOString(),
                checks: {
                    redis: this.getResultValue(redisHealth),
                    transportService: this.getResultValue(transportHealth),
                    ticketService: this.getResultValue(ticketHealth),
                    cache: this.getResultValue(cacheHealth),
                    scheduler: this.getResultValue(schedulerHealth)
                },
                responseTime: `${Date.now() - startTime}ms`
            };

            // Determine overall health status
            const criticalServices = ['redis', 'cache'];
            const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
            const criticalHealthy = criticalServices.every(service => 
                health.checks[service]?.status === 'healthy'
            );

            if (allHealthy) {
                health.status = 'healthy';
            } else if (criticalHealthy) {
                health.status = 'degraded';
            } else {
                health.status = 'unhealthy';
            }

            const statusCode = health.status === 'healthy' ? 200 : 
                              health.status === 'degraded' ? 200 : 503;

            res.status(statusCode).json(health);

        } catch (error) {
            logger.error('Detailed health check failed', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(503).json({
                status: 'unhealthy',
                service: config.app.name,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Check Redis health
     */
    async checkRedisHealth() {
        try {
            const connected = redisConfig.isRedisConnected();
            const client = redisConfig.getRedisClient();

            if (!connected || !client) {
                return {
                    status: 'unhealthy',
                    connected: false,
                    error: 'Redis client not connected'
                };
            }

            // Test Redis with a simple ping
            const pingStart = Date.now();
            await client.ping();
            const responseTime = Date.now() - pingStart;

            return {
                status: 'healthy',
                connected: true,
                responseTime: `${responseTime}ms`,
                host: config.redis.host,
                port: config.redis.port
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                connected: false,
                error: error.message
            };
        }
    }

    /**
     * Check Transport Service health
     */
    async checkTransportServiceHealth() {
        try {
            const health = await this.transportService.checkHealth();
            return {
                status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
                ...health,
                url: config.services.transport.url
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                url: config.services.transport.url
            };
        }
    }

    /**
     * Check Ticket Service health
     */
    async checkTicketServiceHealth() {
        try {
            const health = await this.ticketService.checkHealth();
            return {
                status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
                ...health,
                url: config.services.ticket.url
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                url: config.services.ticket.url
            };
        }
    }

    /**
     * Check Cache health
     */
    async checkCacheHealth() {
        try {
            const cacheStatus = await this.cacheService.getCacheStatus();
            const isHealthy = cacheStatus.redis?.connected && !cacheStatus.dataAge?.isStale;

            return {
                status: isHealthy ? 'healthy' : 'degraded',
                redis: cacheStatus.redis,
                dataAge: cacheStatus.dataAge,
                lastFetch: cacheStatus.lastFetch
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    /**
     * Check Scheduler health
     */
    async checkSchedulerHealth() {
        try {
            const health = this.schedulerService.healthCheck();
            return {
                status: health.healthy ? 'healthy' : 'degraded',
                ...health
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    /**
     * Get system information
     * GET /health/info
     */
    async getSystemInfo(req, res) {
        try {
            const memoryUsage = process.memoryUsage();
            const uptime = Math.floor((Date.now() - this.serviceStartTime) / 1000);

            const systemInfo = {
                service: {
                    name: config.app.name,
                    version: '1.0.0',
                    environment: config.app.env,
                    port: config.app.port,
                    uptime: {
                        seconds: uptime,
                        human: this.formatUptime(uptime)
                    }
                },
                node: {
                    version: process.version,
                    platform: process.platform,
                    arch: process.arch,
                    pid: process.pid
                },
                memory: {
                    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
                    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
                    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                    external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
                },
                configuration: {
                    scheduler: {
                        enabled: config.scheduler.enabled,
                        interval: config.scheduler.fetchIntervalHours + ' hours'
                    },
                    cache: {
                        ttl: config.cache.ttlHours + ' hours',
                        keyPrefix: config.redis.keyPrefix
                    },
                    services: {
                        transport: config.services.transport.url,
                        ticket: config.services.ticket.url
                    }
                },
                timestamp: new Date().toISOString()
            };

            res.json({
                success: true,
                data: systemInfo
            });

        } catch (error) {
            logger.error('Error fetching system info', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching system info',
                error: error.message
            });
        }
    }

    /**
     * Readiness probe for Kubernetes
     * GET /health/ready
     */
    async getReadiness(req, res) {
        try {
            const redisConnected = redisConfig.isRedisConnected();
            const cacheStatus = await this.cacheService.getCacheStatus();
            
            // Service is ready if Redis is connected and we have some cached data
            const hasData = cacheStatus.lastFetch?.timestamp;
            const isReady = redisConnected && hasData;

            const readiness = {
                ready: isReady,
                checks: {
                    redis: redisConnected,
                    dataAvailable: !!hasData
                },
                timestamp: new Date().toISOString()
            };

            const statusCode = isReady ? 200 : 503;
            res.status(statusCode).json(readiness);

        } catch (error) {
            res.status(503).json({
                ready: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Liveness probe for Kubernetes
     * GET /health/live
     */
    async getLiveness(req, res) {
        try {
            // Service is alive if the process is running and Redis is responsive
            const redisConnected = redisConfig.isRedisConnected();

            const liveness = {
                alive: redisConnected,
                timestamp: new Date().toISOString()
            };

            const statusCode = redisConnected ? 200 : 503;
            res.status(statusCode).json(liveness);

        } catch (error) {
            res.status(503).json({
                alive: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Helper method to extract value from Promise.allSettled result
     */
    getResultValue(result) {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            return {
                status: 'unhealthy',
                error: result.reason?.message || 'Unknown error'
            };
        }
    }

    /**
     * Format uptime in human readable format
     */
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

        return parts.join(' ');
    }
}

module.exports = HealthController; 