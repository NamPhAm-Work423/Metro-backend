const Redis = require('redis');
const { logger } = require('../config/logger');
const { config } = require('../config');
const TransportGrpcService = require('./transport.grpc.service');
const FareGrpcService = require('./fare.grpc.service');

class CacheService {
    constructor() {
        this.redisClient = null;
        this.transportService = new TransportGrpcService();
        this.ticketService = new FareGrpcService();
        this.initializeRedis();
    }

    /**
     * Initialize Redis client
     */
    async initializeRedis() {
        try {
            this.redisClient = Redis.createClient({
                url: config.redis.url,
                password: config.redis.password
            });

            this.redisClient.on('error', (error) => {
                logger.error('Redis client error', { error: error.message });
            });

            this.redisClient.on('connect', () => {
                logger.info('Redis client connected');
            });

            await this.redisClient.connect();
        } catch (error) {
            logger.error('Failed to initialize Redis client', { error: error.message });
            throw error;
        }
    }

    /**
     * Cache transport data from gRPC service
     */
    async cacheTransportData() {
        logger.info('Caching transport data');
        
        try {
            const data = await this.transportService.fetchAllTransportData();
            
            // Cache routes
            await this.redisClient.set(
                'public_service_routes:all',
                JSON.stringify(data.routes),
                { EX: config.redis.ttl }
            );

            // Cache route stations
            await this.redisClient.set(
                'public_service_route_stations:all',
                JSON.stringify(data.routeStations),
                { EX: config.redis.ttl }
            );

            // Cache individual routes and their stations
            for (const route of data.routes) {
                await this.redisClient.set(
                    `public_service_routes:${route.routeId}`,
                    JSON.stringify(route),
                    { EX: config.redis.ttl }
                );

                const routeStations = data.routeStations.filter(rs => rs.routeId === route.routeId);
                await this.redisClient.set(
                    `public_service_route_stations:${route.routeId}`,
                    JSON.stringify(routeStations),
                    { EX: config.redis.ttl }
                );
            }

            // Cache metadata
            await this.redisClient.set(
                'public_service_transport:metadata',
                JSON.stringify({
                    lastUpdated: new Date().toISOString(),
                    routeCount: data.routes.length,
                    routeStationCount: data.routeStations.length
                }),
                { EX: config.redis.ttl }
            );

            logger.info('Successfully cached transport data', {
                routeCount: data.routes.length,
                routeStationCount: data.routeStations.length
            });

            return true;
        } catch (error) {
            logger.error('Failed to cache transport data', { error: error.message });
            throw error;
        }
    }

    /**
     * Cache ticket data
     */
    async cacheTicketData() {
        logger.info('Caching ticket data');
        
        try {
            const data = await this.ticketService.fetchAllTicketData();
            
            // Cache fares
            await this.redisClient.set(
                'public_service_fares:all',
                JSON.stringify(data.fares),
                { EX: config.redis.ttl }
            );

            // Cache transit passes
            await this.redisClient.set(
                'public_service_transit_passes:all',
                JSON.stringify(data.transitPasses),
                { EX: config.redis.ttl }
            );

            // Cache metadata
            await this.redisClient.set(
                'public_service_ticket:metadata',
                JSON.stringify({
                    lastUpdated: new Date().toISOString(),
                    fareCount: data.fares.length,
                    transitPassCount: data.transitPasses.length
                }),
                { EX: config.redis.ttl }
            );

            logger.info('Successfully cached ticket data', {
                fareCount: data.fares.length,
                transitPassCount: data.transitPasses.length
            });

            return true;
        } catch (error) {
            logger.error('Failed to cache ticket data', { error: error.message });
            throw error;
        }
    }

    /**
     * Get cached transport data
     */
    async getTransportData() {
        try {
            const [routes, routeStations, metadata] = await Promise.all([
                this.redisClient.get('public_service_routes:all'),
                this.redisClient.get('public_service_route_stations:all'),
                this.redisClient.get('public_service_transport:metadata')
            ]);

            return {
                routes: routes ? JSON.parse(routes) : [],
                routeStations: routeStations ? JSON.parse(routeStations) : [],
                metadata: metadata ? JSON.parse(metadata) : null
            };
        } catch (error) {
            logger.error('Failed to get cached transport data', { error: error.message });
            throw error;
        }
    }

    /**
     * Get cached ticket data
     */
    async getTicketData() {
        try {
            const [fares, transitPasses, metadata] = await Promise.all([
                this.redisClient.get('public_service_fares:all'),
                this.redisClient.get('public_service_transit_passes:all'),
                this.redisClient.get('public_service_ticket:metadata')
            ]);

            return {
                fares: fares ? JSON.parse(fares) : [],
                transitPasses: transitPasses ? JSON.parse(transitPasses) : [],
                metadata: metadata ? JSON.parse(metadata) : null
            };
        } catch (error) {
            logger.error('Failed to get cached ticket data', { error: error.message });
            throw error;
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats() {
        try {
            const [transportMeta, ticketMeta] = await Promise.all([
                this.redisClient.get('public_service_transport:metadata'),
                this.redisClient.get('public_service_ticket:metadata')
            ]);

            return {
                transport: transportMeta ? JSON.parse(transportMeta) : null,
                ticket: ticketMeta ? JSON.parse(ticketMeta) : null,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Failed to get cache statistics', { error: error.message });
            throw error;
        }
    }

    /**
     * Clear all cached data
     */
    async clearCache() {
        try {
            await this.redisClient.flushDb();
            logger.info('Cache cleared successfully');
            return true;
        } catch (error) {
            logger.error('Failed to clear cache', { error: error.message });
            throw error;
        }
    }

    /**
     * Check cache health
     */
    async checkHealth() {
        try {
            await this.redisClient.ping();
            return {
                status: 'healthy',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = CacheService; 