const { logger } = require('../config/logger');
const { setWithExpiry, withRedisClient } = require('../config/redis');
const TransportGrpcService = require('./transport.grpc.service');
const FareGrpcService = require('./fare.grpc.service');
const PassengerDiscountService = require('./passengerDiscount.service');
const TransitPassService = require('./transitPass.service');

class CacheService {
    constructor() {
        this.transportService = new TransportGrpcService();
        this.fareService = new FareGrpcService();
        this.passengerDiscountService = new PassengerDiscountService();
        this.transitPassService = new TransitPassService();
        this.keyPrefix = process.env.REDIS_KEY_PREFIX || 'service:';
        this.cacheKeys = {
            TRANSPORT_DATA: `${this.keyPrefix}transport:all`,
            FARE_DATA: `${this.keyPrefix}fare:all`,
            ROUTES: `${this.keyPrefix}transport:routes`,
            ROUTE_STATIONS: `${this.keyPrefix}transport:route_stations`,
            FARES: `${this.keyPrefix}fare:fares`,
            TRANSIT_PASSES: `${this.keyPrefix}fare:transit_passes`,
            PASSENGER_DISCOUNTS: `${this.keyPrefix}fare:passenger_discounts`,
            LAST_UPDATE: `${this.keyPrefix}cache:last_update`
        };
        this.cacheTTL = 3600; // 1 hour in seconds
        
        logger.info('Cache service initialized with key prefix', { 
            keyPrefix: this.keyPrefix,
            cacheKeys: Object.keys(this.cacheKeys)
        });
    }

    /**
     * Cache transport data to Redis
     */
    async cacheTransportData() {
        try {
            logger.info('Caching transport data to Redis');
            
            const transportData = await this.transportService.fetchAllTransportData();
            
            // Cache complete transport data
            await setWithExpiry(this.cacheKeys.TRANSPORT_DATA, JSON.stringify(transportData), this.cacheTTL);
            
            // Cache individual components for faster access
            await setWithExpiry(this.cacheKeys.ROUTES, JSON.stringify(transportData.routes || []), this.cacheTTL);
            await setWithExpiry(this.cacheKeys.ROUTE_STATIONS, JSON.stringify(transportData.routeStations || []), this.cacheTTL);
            
            logger.info('Transport data cached successfully', {
                routeCount: transportData.routes?.length || 0,
                routeStationCount: transportData.routeStations?.length || 0,
                ttl: this.cacheTTL
            });
            
            return transportData;
        } catch (error) {
            logger.error('Failed to cache transport data', { error: error.message });
            throw new Error(`Failed to cache transport data: ${error.message}`);
        }
    }

    /**
     * Cache fare data to Redis
     */
    async cacheFareData() {
        try {
            logger.info('Caching fare data to Redis');
            
            const fareData = await this.fareService.fetchAllTicketData();
            const transitPasses = await this.transitPassService.fetchAllTransitPasses();
            
            // Cache complete fare data
            await setWithExpiry(this.cacheKeys.FARE_DATA, JSON.stringify({ ...fareData, transitPasses }), this.cacheTTL);
            
            // Cache individual components for faster access
            await setWithExpiry(this.cacheKeys.FARES, JSON.stringify(fareData.fares || []), this.cacheTTL);
            await setWithExpiry(this.cacheKeys.TRANSIT_PASSES, JSON.stringify(transitPasses || []), this.cacheTTL);
            
            logger.info('Fare data cached successfully', {
                fareCount: fareData.fares?.length || 0,
                transitPassCount: transitPasses?.length || 0,
                ttl: this.cacheTTL
            });
            
            return { ...fareData, transitPasses };
        } catch (error) {
            logger.error('Failed to cache fare data', { error: error.message });
            throw new Error(`Failed to cache fare data: ${error.message}`);
        }
    }

    /**
     * Cache passenger discounts to Redis
     */
    async cachePassengerDiscountData() {
        try {
            logger.info('Caching passenger discounts to Redis');

            const discounts = await this.passengerDiscountService.fetchAllPassengerDiscounts({ onlyCurrentlyValid: true });

            await setWithExpiry(this.cacheKeys.PASSENGER_DISCOUNTS, JSON.stringify(discounts || []), this.cacheTTL);

            logger.info('Passenger discounts cached successfully', {
                discountCount: discounts?.length || 0,
                ttl: this.cacheTTL
            });

            return discounts;
        } catch (error) {
            logger.error('Failed to cache passenger discounts', { error: error.message });
            throw new Error(`Failed to cache passenger discounts: ${error.message}`);
        }
    }

    /**
     * Cache all data to Redis (transport + fare)
     */
    async cacheAllData() {
        logger.info('Caching all data to Redis');
        
        const results = {
            transport: false,
            ticket: false,
            discounts: false,
            error: null,
            timestamp: new Date().toISOString(),
            data: {
                routes: [],
                routeStations: [],
                fares: [],
                transitPasses: [],
                passengerDiscounts: []
            }
        };

        try {
            // Cache transport and fare data in parallel
            const [transportResult, fareResult, discountResult] = await Promise.allSettled([
                this.cacheTransportData(),
                this.cacheFareData(),
                this.cachePassengerDiscountData()
            ]);

            // Check transport result
            if (transportResult.status === 'fulfilled') {
                results.transport = true;
                results.data.routes = transportResult.value.routes || [];
                results.data.routeStations = transportResult.value.routeStations || [];
                logger.info('Transport data cached successfully');
            } else {
                logger.error('Failed to cache transport data', { error: transportResult.reason.message });
                results.error = transportResult.reason.message;
            }

            // Check fare result
            if (fareResult.status === 'fulfilled') {
                results.ticket = true;
                results.data.fares = fareResult.value.fares || [];
                results.data.transitPasses = fareResult.value.transitPasses || [];
                logger.info('Fare data cached successfully');
            } else {
                logger.error('Failed to cache fare data', { error: fareResult.reason.message });
                results.error = fareResult.reason.message || results.error;
            }

            // Check passenger discount result
            if (discountResult.status === 'fulfilled') {
                results.discounts = true;
                results.data.passengerDiscounts = discountResult.value || [];
                logger.info('Passenger discounts cached successfully');
            } else {
                logger.error('Failed to cache passenger discounts', { error: discountResult.reason.message });
                results.error = discountResult.reason.message || results.error;
            }

            // Cache last update timestamp if at least one succeeded
            if (results.transport || results.ticket) {
                await setWithExpiry(this.cacheKeys.LAST_UPDATE, results.timestamp, this.cacheTTL);
            }

            // Log overall result
            const success = results.transport && results.ticket && results.discounts;
            logger.info('Cache all data operation completed', {
                success,
                transportCached: results.transport,
                fareCached: results.ticket,
                discountsCached: results.discounts,
                error: results.error
            });

            return results;
        } catch (error) {
            logger.error('Unexpected error during cache all data operation', { error: error.message });
            results.error = error.message;
            return results;
        }
    }

    /**
     * Get transport data from Redis cache (fallback to gRPC)
     */
    async getTransportData() {
        try {
            // Try to get from Redis first
            const cachedData = await withRedisClient(async (client) => {
                const data = await client.get(this.cacheKeys.TRANSPORT_DATA);
                return data ? JSON.parse(data) : null;
            });

            if (cachedData) {
                logger.info('Retrieved transport data from Redis cache');
                return cachedData;
            }

            // Fallback to gRPC and cache the result
            logger.info('Transport data not in cache, fetching from gRPC');
            return await this.cacheTransportData();
        } catch (error) {
            logger.error('Failed to get transport data', { error: error.message });
            throw error;
        }
    }

    /**
     * Get fare data from Redis cache (fallback to gRPC)
     */
    async getFareData() {
        try {
            // Try to get from Redis first
            const cachedData = await withRedisClient(async (client) => {
                const data = await client.get(this.cacheKeys.FARE_DATA);
                return data ? JSON.parse(data) : null;
            });

            if (cachedData) {
                logger.info('Retrieved fare data from Redis cache');
                return cachedData;
            }

            // Fallback to gRPC and cache the result
            logger.info('Fare data not in cache, fetching from gRPC');
            return await this.cacheFareData();
        } catch (error) {
            logger.error('Failed to get fare data', { error: error.message });
            throw error;
        }
    }

    /**
     * Get passenger discounts from Redis cache (fallback to gRPC)
     */
    async getPassengerDiscounts() {
        try {
            const cachedData = await withRedisClient(async (client) => {
                const data = await client.get(this.cacheKeys.PASSENGER_DISCOUNTS);
                return data ? JSON.parse(data) : null;
            });

            if (cachedData) {
                logger.info('Retrieved passenger discounts from Redis cache');
                return cachedData;
            }

            logger.info('Passenger discounts not in cache, fetching from gRPC');
            return await this.cachePassengerDiscountData();
        } catch (error) {
            logger.error('Failed to get passenger discounts', { error: error.message });
            throw error;
        }
    }

    /**
     * Get all data from Redis cache (fallback to gRPC)
     */
    async getAllData() {
        logger.info('Getting all data from Redis cache');
        
        try {
            const [transportData, fareData, discountData, transitPassData] = await Promise.allSettled([
                this.getTransportData(),
                this.getFareData(),
                this.getPassengerDiscounts(),
                this.getTransitPasses()
            ]);

            const results = {
                transport: transportData.status === 'fulfilled',
                ticket: fareData.status === 'fulfilled',
                discounts: discountData.status === 'fulfilled',
                transitPasses: transitPassData.status === 'fulfilled',
                error: null,
                timestamp: new Date().toISOString(),
                data: {
                    routes: [],
                    routeStations: [],
                    fares: [],
                    transitPasses: [],
                    passengerDiscounts: []
                }
            };

            if (transportData.status === 'fulfilled') {
                results.data.routes = transportData.value.routes || [];
                results.data.routeStations = transportData.value.routeStations || [];
            } else {
                results.error = transportData.reason.message;
            }

            if (fareData.status === 'fulfilled') {
                results.data.fares = fareData.value.fares || [];
                results.data.transitPasses = fareData.value.transitPasses || [];
            } else {
                results.error = fareData.reason.message || results.error;
            }

            // Ensure transit passes are present even if missing from fareData
            if (transitPassData.status === 'fulfilled') {
                if ((transitPassData.value || []).length > 0 && (results.data.transitPasses || []).length === 0) {
                    results.data.transitPasses = transitPassData.value;
                }
            } else if (transitPassData.status === 'rejected') {
                results.error = transitPassData.reason.message || results.error;
            }

            if (discountData.status === 'fulfilled') {
                results.data.passengerDiscounts = discountData.value || [];
            } else {
                results.error = discountData.reason.message || results.error;
            }

            return results;
        } catch (error) {
            logger.error('Failed to get all data', { error: error.message });
            throw error;
        }
    }

    /**
     * Get cache status and statistics
     */
    async getCacheStatus() {
        try {
            const status = await withRedisClient(async (client) => {
                if (!client) {
                    return {
                        keys: [],
                        lastUpdate: null,
                        cacheTTL: this.cacheTTL,
                        connected: false
                    };
                }

                const keys = Object.values(this.cacheKeys);
                const ttls = await Promise.all(keys.map(key => 
                    client.ttl(key).catch(() => -1)
                ));
                const exists = await Promise.all(keys.map(key => 
                    client.exists(key).catch(() => 0)
                ));
                
                const lastUpdate = await client.get(this.cacheKeys.LAST_UPDATE).catch(() => null);
                
                return {
                    keys: keys.map((key, index) => ({
                        key,
                        exists: exists[index] === 1,
                        ttl: ttls[index]
                    })),
                    lastUpdate: lastUpdate || null,
                    cacheTTL: this.cacheTTL,
                    connected: true
                };
            });

            if (!status) {
                return {
                    healthy: false,
                    error: 'Redis client not available',
                    timestamp: new Date().toISOString()
                };
            }

            return {
                healthy: status.connected && status.keys.some(k => k.exists),
                ...status,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Failed to get cache status', { error: error.message });
            return {
                healthy: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Clear all cache
     */
    async clearCache() {
        try {
            await withRedisClient(async (client) => {
                if (!client) {
                    return;
                }
                
                // Get all keys with our prefix
                const keys = await client.keys(`${this.keyPrefix}*`);
                if (keys.length > 0) {
                    await client.del(keys);
                    logger.info('Cache cleared successfully', { 
                        keysCleared: keys.length,
                        keyPrefix: this.keyPrefix
                    });
                }
            });
            
            return { success: true, timestamp: new Date().toISOString() };
        } catch (error) {
            logger.error('Failed to clear cache', { error: error.message });
            throw error;
        }
    }

    /**
     * Get all keys with prefix (for debugging/testing)
     */
    async getAllKeysWithPrefix() {
        try {
            return await withRedisClient(async (client) => {
                if (!client) {
                    return [];
                }
                
                return await client.keys(`${this.keyPrefix}*`);
            });
        } catch (error) {
            logger.error('Failed to get keys with prefix', { error: error.message });
            return [];
        }
    }

    /**
     * Legacy methods for backward compatibility - direct gRPC calls
     */
    async fetchTransportData() {
        return await this.transportService.fetchAllTransportData();
    }

    async fetchTicketData() {
        return await this.fareService.fetchAllTicketData();
    }

    // Legacy method name compatibility
    async getTicketData() {
        return await this.getFareData();
    }

    /**
     * Check data availability (health check)
     */
    async checkDataAvailability() {
        try {
            const results = await this.getAllData();
            return {
                healthy: results.transport && results.ticket,
                transport: results.transport,
                ticket: results.ticket,
                error: results.error,
                timestamp: results.timestamp
            };
        } catch (error) {
            logger.error('Failed to check data availability', { error: error.message });
            return {
                healthy: false,
                transport: false,
                ticket: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Individual gRPC methods for specific data requests
     */
    async getRoutesByStations(originStationId, destinationStationId) {
        try {
            return await this.transportService.getRoutesByStations(originStationId, destinationStationId);
        } catch (error) {
            logger.error('Failed to get routes by stations', { error: error.message });
            throw error;
        }
    }

    async getRoute(routeId) {
        try {
            return await this.transportService.getRoute(routeId);
        } catch (error) {
            logger.error('Failed to get route', { error: error.message });
            throw error;
        }
    }

    async getStation(stationId) {
        try {
            return await this.transportService.getStation(stationId);
        } catch (error) {
            logger.error('Failed to get station', { error: error.message });
            throw error;
        }
    }

    async getRouteStations(routeId) {
        try {
            return await this.transportService.fetchRouteStations(routeId);
        } catch (error) {
            logger.error('Failed to get route stations', { error: error.message });
            throw error;
        }
    }

    async calculateStationCount(routeId, originStationId, destinationStationId) {
        try {
            return await this.transportService.calculateStationCount(routeId, originStationId, destinationStationId);
        } catch (error) {
            logger.error('Failed to calculate station count', { error: error.message });
            throw error;
        }
    }

    async getFare(fareId) {
        try {
            return await this.fareService.fetchFareById(fareId);
        } catch (error) {
            logger.error('Failed to get fare', { error: error.message });
            throw error;
        }
    }

    async getTransitPass(transitPassId) {
        try {
            return await this.fareService.fetchTransitPassById(transitPassId);
        } catch (error) {
            logger.error('Failed to get transit pass', { error: error.message });
            throw error;
        }
    }

    /**
     * Get all routes from cache
     */
    async getRoutes() {
        try {
            const transportData = await this.getTransportData();
            return transportData?.routes || [];
        } catch (error) {
            logger.error('Failed to get routes', { error: error.message });
            throw error;
        }
    }

    /**
     * Get all stations from cache
     */
    async getStations() {
        try {
            const transportData = await this.getTransportData();
            return transportData?.stations || [];
        } catch (error) {
            logger.error('Failed to get stations', { error: error.message });
            throw error;
        }
    }

    /**
     * Get all fares from cache
     */
    async getFares() {
        try {
            const fareData = await this.getFareData();
            return fareData?.fares || [];
        } catch (error) {
            logger.error('Failed to get fares', { error: error.message });
            throw error;
        }
    }

    /**
     * Get all transit passes from cache
     */
    async getTransitPasses() {
        try {
            const fareData = await this.getFareData();
            return fareData?.transitPasses || [];
        } catch (error) {
            logger.error('Failed to get transit passes', { error: error.message });
            throw error;
        }
    }

    /**
     * Get specific route by ID from cache
     */
    async getRouteById(routeId) {
        try {
            const routes = await this.getRoutes();
            return routes.find(route => route.id === routeId) || null;
        } catch (error) {
            logger.error('Failed to get route by ID', { routeId, error: error.message });
            throw error;
        }
    }

    /**
     * Get specific station by ID from cache
     */
    async getStationById(stationId) {
        try {
            const stations = await this.getStations();
            return stations.find(station => station.id === stationId) || null;
        } catch (error) {
            logger.error('Failed to get station by ID', { stationId, error: error.message });
            throw error;
        }
    }

    /**
     * Get fares for a specific route from cache
     */
    async getFaresByRoute(routeId) {
        try {
            const fares = await this.getFares();
            return fares.filter(fare => fare.routeId === routeId);
        } catch (error) {
            logger.error('Failed to get fares by route', { routeId, error: error.message });
            throw error;
        }
    }

    /**
     * Get transit passes by type from cache
     */
    async getTransitPassByType(type) {
        try {
            const transitPasses = await this.getTransitPasses();
            return transitPasses.find(pass => pass.type === type) || null;
        } catch (error) {
            logger.error('Failed to get transit pass by type', { type, error: error.message });
            throw error;
        }
    }
}

module.exports = CacheService; 