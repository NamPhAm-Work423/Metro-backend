const { logger } = require('../config/logger');
const TransportService = require('../services/transport.service');
const CacheService = require('../services/cache.service');
const SchedulerService = require('../services/scheduler.service');

class HealthController {
    constructor() {
        this.transportService = new TransportService();
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

            // Basic checks - gRPC service availability
            const dataAvailability = await this.cacheService.checkDataAvailability();
            const uptime = Math.floor((Date.now() - this.serviceStartTime) / 1000);

            const health = {
                status: dataAvailability.healthy ? 'healthy' : 'unhealthy',
                service: 'public-service',
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                port: process.env.PORT || 3007,
                uptime: {   
                    seconds: uptime,
                    human: this.formatUptime(uptime)
                },
                timestamp: new Date().toISOString(),
                checks: {
                    grpcServices: {
                        status: dataAvailability.healthy ? 'healthy' : 'unhealthy',
                        transport: dataAvailability.transport,
                        ticket: dataAvailability.ticket,
                        error: dataAvailability.error
                    }
                },
                responseTime: `${Date.now() - startTime}ms`
            };

            const statusCode = dataAvailability.healthy ? 200 : 503;
            res.status(statusCode).json(health);

        } catch (error) {
            logger.error('Health check failed', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(503).json({
                status: 'unhealthy',
                service: 'public-service',
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
                transportHealth,
                ticketHealth,
                dataAvailabilityHealth,
                schedulerHealth
            ] = await Promise.allSettled([
                this.checkTransportServiceHealth(),
                this.checkTicketServiceHealth(),
                this.checkDataAvailabilityHealth(),
                this.checkSchedulerHealth()
            ]);

            const uptime = Math.floor((Date.now() - this.serviceStartTime) / 1000);

            const health = {
                status: 'healthy', // Will be updated based on checks
                service: 'public-service',
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                port: process.env.PORT || 3007,
                uptime: {
                    seconds: uptime,
                    human: this.formatUptime(uptime)
                },
                timestamp: new Date().toISOString(),
                checks: {
                    transportService: this.getResultValue(transportHealth),
                    ticketService: this.getResultValue(ticketHealth),
                    dataAvailability: this.getResultValue(dataAvailabilityHealth),
                    scheduler: this.getResultValue(schedulerHealth)
                },
                responseTime: `${Date.now() - startTime}ms`
            };

            // Determine overall health status
            const criticalServices = ['dataAvailability'];
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
                service: 'public-service',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Check data availability through gRPC services
     */
    async checkDataAvailabilityHealth() {
        try {
            const availability = await this.cacheService.checkDataAvailability();
            return {
                status: availability.healthy ? 'healthy' : 'unhealthy',
                transport: availability.transport,
                ticket: availability.ticket,
                error: availability.error,
                timestamp: availability.timestamp
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                transport: false,
                ticket: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Check Transport Service health via gRPC
     */
    async checkTransportServiceHealth() {
        try {
            // Try to fetch routes to check if transport service is healthy
            const routes = await this.cacheService.getTransportData();
            const hasRoutes = routes.routes && routes.routes.length > 0;
            
            return {
                status: hasRoutes ? 'healthy' : 'degraded',
                routeCount: routes.routes?.length || 0,
                routeStationCount: routes.routeStations?.length || 0,
                grpcUrl: `${process.env.TRANSPORT_SERVICE_GRPC_HOST || 'transport-service'}:${process.env.TRANSPORT_SERVICE_GRPC_PORT || '50051'}`
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                grpcUrl: `${process.env.TRANSPORT_SERVICE_GRPC_HOST || 'transport-service'}:${process.env.TRANSPORT_SERVICE_GRPC_PORT || '50051'}`
            };
        }
    }

    /**
     * Check Ticket Service health via gRPC
     */
    async checkTicketServiceHealth() {
        try {
            // Try to fetch fares to check if ticket service is healthy
            const tickets = await this.cacheService.getTicketData();
            const hasFares = tickets.fares && tickets.fares.length > 0;
            
            return {
                status: hasFares ? 'healthy' : 'degraded',
                fareCount: tickets.fares?.length || 0,
                transitPassCount: tickets.transitPasses?.length || 0,
                grpcUrl: `${process.env.TICKET_SERVICE_GRPC_HOST || 'ticket-service'}:${process.env.TICKET_SERVICE_GRPC_PORT || '50052'}`
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                grpcUrl: `${process.env.TICKET_SERVICE_GRPC_HOST || 'ticket-service'}:${process.env.TICKET_SERVICE_GRPC_PORT || '50052'}`
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
                    name: 'public-service',
                    version: '1.0.0',
                    environment: process.env.NODE_ENV || 'development',
                    port: process.env.PORT || 3007,
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
                        enabled: process.env.SCHEDULER_ENABLED || 'true',
                        interval: '1 hour'
                    },
                    grpcServices: {
                        transport: `${process.env.TRANSPORT_SERVICE_GRPC_HOST || 'transport-service'}:${process.env.TRANSPORT_SERVICE_GRPC_PORT || '50051'}`,
                        ticket: `${process.env.TICKET_SERVICE_GRPC_HOST || 'ticket-service'}:${process.env.TICKET_SERVICE_GRPC_PORT || '50052'}`
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
            // Service is ready if gRPC services are accessible and we can fetch data
            const dataAvailability = await this.cacheService.checkDataAvailability();
            const isReady = dataAvailability.healthy;

            const readiness = {
                ready: isReady,
                checks: {
                    transportService: dataAvailability.transport,
                    ticketService: dataAvailability.ticket,
                    dataAvailable: dataAvailability.healthy
                },
                error: dataAvailability.error,
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
            // Service is alive if the process is running and can respond
            const liveness = {
                alive: true,
                timestamp: new Date().toISOString()
            };

            res.status(200).json(liveness);

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

module.exports = new HealthController(); 