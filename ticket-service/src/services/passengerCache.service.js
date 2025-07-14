const { getClient } = require('../config/redis');
const { logger } = require('../config/logger');

class PassengerCacheService {
    constructor() {
        // Use configurable prefix for different environments
        // Default: service:ticket:passenger:{passengerId}
        // Can override: REDIS_KEY_PREFIX=dev: -> dev:ticket:passenger:{passengerId}
        const SERVICE_PREFIX = process.env.REDIS_KEY_PREFIX || 'service:';
        this.keyPrefix = `${SERVICE_PREFIX}ticket:passenger:`;
        this.defaultTTL = 24 * 60 * 60; // 24 hours
    }

    _getCacheKey(passengerId) {
        return `${this.keyPrefix}${passengerId}`;
    }

    async setPassenger(passengerId, passengerData, ttl = this.defaultTTL) {
        try {
            const redis = getClient();
            if (!redis) throw new Error('Redis client not available');

            const cacheKey = this._getCacheKey(passengerId);
            const data = JSON.stringify({
                ...passengerData,
                cachedAt: new Date().toISOString(),
                ttl
            });

            await redis.set(cacheKey, data, { EX: ttl });
            logger.info(`Passenger cached: ${passengerId}`, { cacheKey, ttl });
            return true;
        } catch (error) {
            logger.error(`Cache SET error for passenger ${passengerId}`, error);
            return false;
        }
    }

    async getPassenger(passengerId) {
        try {
            const redis = getClient();
            if (!redis) throw new Error('Redis client not available');

            const data = await redis.get(this._getCacheKey(passengerId));
            if (!data) return null;

            const passenger = JSON.parse(data);
            logger.debug(`Passenger cache HIT: ${passengerId}`, { cachedAt: passenger.cachedAt });
            return passenger;
        } catch (error) {
            logger.error(`Cache GET error for passenger ${passengerId}`, error);
            return null;
        }
    }

    async getPassengers(passengerIds) {
        try {
            const redis = getClient();
            if (!redis) throw new Error('Redis client not available');

            const keys = passengerIds.map(id => this._getCacheKey(id));
            const dataArr = await redis.mGet(keys);

            const result = {};
            const missing = [];

            dataArr.forEach((data, i) => {
                const id = passengerIds[i];
                if (data) {
                    try {
                        result[id] = JSON.parse(data);
                    } catch {
                        missing.push(id);
                    }
                } else {
                    missing.push(id);
                }
            });

            logger.debug('Bulk passenger cache lookup', {
                total: passengerIds.length,
                hit: Object.keys(result).length,
                miss: missing.length
            });

            return { passengers: result, missingIds: missing };
        } catch (error) {
            logger.error('Cache MGET error for passengers', error);
            return { passengers: {}, missingIds: passengerIds };
        }
    }

    async getPassengerByUserId(userId) {
        try {
            const redis = getClient();
            if (!redis) throw new Error('Redis client not available');

            const keys = await redis.keys(`${this.keyPrefix}*`);
            for (const key of keys) {
                const data = await redis.get(key);
                if (data) {
                    try {
                        const passenger = JSON.parse(data);
                        if (passenger.userId === userId) {
                            logger.debug(`Found passenger by userId ${userId}`, { id: passenger.passengerId });
                            return passenger;
                        }
                    } catch {}
                }
            }

            return null;
        } catch (error) {
            logger.error(`Cache search error for userId ${userId}`, error);
            return null;
        }
    }

    async hasPassenger(passengerId) {
        try {
            const redis = getClient();
            if (!redis) throw new Error('Redis client not available');

            const exists = await redis.exists(this._getCacheKey(passengerId));
            return exists === 1;
        } catch (error) {
            logger.error(`Cache EXISTS error for ${passengerId}`, error);
            return false;
        }
    }

    async removePassenger(passengerId) {
        try {
            const redis = getClient();
            if (!redis) throw new Error('Redis client not available');

            const result = await redis.del(this._getCacheKey(passengerId));
            return result > 0;
        } catch (error) {
            logger.error(`Cache DEL error for passenger ${passengerId}`, error);
            return false;
        }
    }

    async refreshPassengerTTL(passengerId, ttl = this.defaultTTL) {
        try {
            const redis = getClient();
            if (!redis) throw new Error('Redis client not available');

            const result = await redis.expire(this._getCacheKey(passengerId), ttl);
            return result === 1;
        } catch (error) {
            logger.error(`Cache EXPIRE error for passenger ${passengerId}`, error);
            return false;
        }
    }

    async setPassengers(passengerMap, ttl = this.defaultTTL) {
        try {
            const redis = getClient();
            if (!redis) throw new Error('Redis client not available');

            const multi = redis.multi();
            const ids = [];

            for (const [passengerId, data] of Object.entries(passengerMap)) {
                const key = this._getCacheKey(passengerId);
                const serialized = JSON.stringify({ ...data, cachedAt: new Date().toISOString(), ttl });
                multi.set(key, serialized, { EX: ttl });
                ids.push(passengerId);
            }

            await multi.exec();
            logger.info(`Batch cached ${ids.length} passengers`);
            return { success: true, passengerIds: ids };
        } catch (error) {
            logger.error('Batch cache SET error', error);
            return { success: false, error: error.message };
        }
    }

    async clearCache() {
        try {
            const redis = getClient();
            if (!redis) throw new Error('Redis client not available');

            const keys = await redis.keys(`${this.keyPrefix}*`);
            if (keys.length > 0) await redis.del(...keys);
            return { cleared: keys.length };
        } catch (error) {
            logger.error('Cache CLEAR error', error);
            return { error: error.message };
        }
    }

    async getCacheStats() {
        try {
            const redis = getClient();
            if (!redis) throw new Error('Redis client not available');

            const keys = await redis.keys(`${this.keyPrefix}*`);
            const sample = keys.slice(0, 5);
            const ttls = await Promise.all(sample.map(async k => ({ key: k, ttl: await redis.ttl(k) })));

            return {
                keyPrefix: this.keyPrefix,
                count: keys.length,
                sampleTTLs: ttls,
                checkedAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Cache STATS error', error);
            return { error: error.message };
        }
    }
}

const passengerCacheService = new PassengerCacheService();
module.exports = passengerCacheService;
