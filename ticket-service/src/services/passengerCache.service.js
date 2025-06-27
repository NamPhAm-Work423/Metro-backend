const { getClient } = require('../config/redis');
const { logger } = require('../config/logger');

class PassengerCacheService {
    constructor() {
        this.keyPrefix = 'ticket-service:passenger-cache:';
        this.defaultTTL = 24 * 60 * 60; // 24 hours in seconds
    }

    // Generate cache key for passenger
    _getCacheKey(passengerId) {
        return `${this.keyPrefix}${passengerId}`;
    }

    // Set passenger data in cache
    async setPassenger(passengerId, passengerData, ttl = this.defaultTTL) {
        try {
            const redis = getClient();
            if (!redis) {
                throw new Error('Redis client not available');
            }

            const cacheKey = this._getCacheKey(passengerId);
            const serializedData = JSON.stringify({
                ...passengerData,
                cachedAt: new Date().toISOString(),
                ttl: ttl
            });

            await redis.set(cacheKey, serializedData, { EX: ttl });
            
            logger.info(`Passenger cached successfully: ${passengerId}`, {
                passengerId,
                ttl,
                cacheKey
            });

            return true;
        } catch (error) {
            logger.error(`Error setting passenger cache: ${passengerId}`, error);
            return false;
        }
    }

    // Get passenger data from cache
    async getPassenger(passengerId) {
        try {
            const redis = getClient();
            if (!redis) {
                throw new Error('Redis client not available');
            }

            const cacheKey = this._getCacheKey(passengerId);
            const cachedData = await redis.get(cacheKey);

            if (!cachedData) {
                logger.debug(`Passenger cache miss: ${passengerId}`);
                return null;
            }

            const passengerData = JSON.parse(cachedData);
            
            logger.debug(`Passenger cache hit: ${passengerId}`, {
                passengerId,
                cachedAt: passengerData.cachedAt
            });

            return passengerData;
        } catch (error) {
            logger.error(`Error getting passenger cache: ${passengerId}`, error);
            return null;
        }
    }

    // Get multiple passengers from cache
    async getPassengers(passengerIds) {
        try {
            const redis = getClient();
            if (!redis) {
                throw new Error('Redis client not available');
            }

            const cacheKeys = passengerIds.map(id => this._getCacheKey(id));
            const cachedData = await redis.mGet(cacheKeys);

            const passengers = {};
            const missingIds = [];

            cachedData.forEach((data, index) => {
                const passengerId = passengerIds[index];
                
                if (data) {
                    try {
                        passengers[passengerId] = JSON.parse(data);
                    } catch (parseError) {
                        logger.error(`Error parsing cached passenger data: ${passengerId}`, parseError);
                        missingIds.push(passengerId);
                    }
                } else {
                    missingIds.push(passengerId);
                }
            });

            logger.debug(`Passengers cache lookup`, {
                requested: passengerIds.length,
                found: Object.keys(passengers).length,
                missing: missingIds.length,
                missingIds
            });

            return { passengers, missingIds };
        } catch (error) {
            logger.error('Error getting multiple passengers from cache', error);
            return { passengers: {}, missingIds: passengerIds };
        }
    }

    // Remove passenger from cache
    async removePassenger(passengerId) {
        try {
            const redis = getClient();
            if (!redis) {
                throw new Error('Redis client not available');
            }

            const cacheKey = this._getCacheKey(passengerId);
            const result = await redis.del(cacheKey);

            if (result > 0) {
                logger.info(`Passenger removed from cache: ${passengerId}`);
                return true;
            } else {
                logger.debug(`Passenger not found in cache for removal: ${passengerId}`);
                return false;
            }
        } catch (error) {
            logger.error(`Error removing passenger from cache: ${passengerId}`, error);
            return false;
        }
    }

    // Check if passenger exists in cache
    async hasPassenger(passengerId) {
        try {
            const redis = getClient();
            if (!redis) {
                throw new Error('Redis client not available');
            }

            const cacheKey = this._getCacheKey(passengerId);
            const exists = await redis.exists(cacheKey);
            return exists === 1;
        } catch (error) {
            logger.error(`Error checking passenger existence in cache: ${passengerId}`, error);
            return false;
        }
    }

    // Refresh passenger TTL
    async refreshPassengerTTL(passengerId, ttl = this.defaultTTL) {
        try {
            const redis = getClient();
            if (!redis) {
                throw new Error('Redis client not available');
            }

            const cacheKey = this._getCacheKey(passengerId);
            const result = await redis.expire(cacheKey, ttl);
            
            if (result === 1) {
                logger.debug(`Passenger TTL refreshed: ${passengerId}`, { ttl });
                return true;
            } else {
                logger.debug(`Passenger not found for TTL refresh: ${passengerId}`);
                return false;
            }
        } catch (error) {
            logger.error(`Error refreshing passenger TTL: ${passengerId}`, error);
            return false;
        }
    }

    // Get cache statistics
    async getCacheStats() {
        try {
            const redis = getClient();
            if (!redis) {
                throw new Error('Redis client not available');
            }

            const pattern = `${this.keyPrefix}*`;
            const keys = await redis.keys(pattern);
            
            const stats = {
                totalPassengers: keys.length,
                keyPrefix: this.keyPrefix,
                defaultTTL: this.defaultTTL,
                timestamp: new Date().toISOString()
            };

            // Get TTL info for first few keys as sample
            if (keys.length > 0) {
                const sampleKeys = keys.slice(0, 5);
                const ttlInfo = await Promise.all(
                    sampleKeys.map(async (key) => {
                        const ttl = await redis.ttl(key);
                        return { key, ttl };
                    })
                );
                stats.sampleTTLs = ttlInfo;
            }

            return stats;
        } catch (error) {
            logger.error('Error getting cache stats', error);
            return { error: error.message };
        }
    }

    // Clear all passenger cache
    async clearCache() {
        try {
            const redis = getClient();
            if (!redis) {
                throw new Error('Redis client not available');
            }

            const pattern = `${this.keyPrefix}*`;
            const keys = await redis.keys(pattern);
            
            if (keys.length > 0) {
                await redis.del(...keys);
                logger.info(`Cleared ${keys.length} passenger cache entries`);
                return { cleared: keys.length };
            } else {
                logger.info('No passenger cache entries to clear');
                return { cleared: 0 };
            }
        } catch (error) {
            logger.error('Error clearing passenger cache', error);
            return { error: error.message };
        }
    }

    // Batch set multiple passengers
    async setPassengers(passengersData, ttl = this.defaultTTL) {
        try {
            const redis = getClient();
            if (!redis) {
                throw new Error('Redis client not available');
            }

            const multi = redis.multi();
            const results = [];

            for (const [passengerId, passengerData] of Object.entries(passengersData)) {
                const cacheKey = this._getCacheKey(passengerId);
                const serializedData = JSON.stringify({
                    ...passengerData,
                    cachedAt: new Date().toISOString(),
                    ttl: ttl
                });

                multi.set(cacheKey, serializedData, { EX: ttl });
                results.push(passengerId);
            }

            await multi.exec();

            logger.info(`Batch cached ${results.length} passengers`, {
                passengerIds: results,
                ttl
            });

            return { success: true, count: results.length, passengerIds: results };
        } catch (error) {
            logger.error('Error batch setting passengers cache', error);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const passengerCacheService = new PassengerCacheService();

module.exports = passengerCacheService; 