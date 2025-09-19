const crypto = require('crypto');
const { logger } = require('../config/logger');
const { getClient, withRedisClient } = require('../config/redis');

/**
 * IdempotencyHelper - Ensures operations are performed only once
 * Uses existing Redis connection from config/redis.js with fallback to memory cache
 */
class IdempotencyHelper {
    constructor() {
        this.defaultTTL = 3600; // 1 hour in seconds
        this.keyPrefix = `${process.env.REDIS_KEY_PREFIX}ticket:idempotency:`;
        this.resultPrefix = `${process.env.REDIS_KEY_PREFIX}ticket:idempotency_result:`;
        // Memory cache fallback when Redis is not available
        this.memoryCache = new Map();
        this.memoryCacheTimers = new Map();
    }

    /**
     * Generate idempotency key from request data
     * @param {string} operation - Operation name (e.g., 'create_ticket', 'use_ticket')
     * @param {Object} data - Request data
     * @param {string} userId - User/Passenger ID
     * @returns {string} Idempotency key
     */
    generateKey(operation, data, userId = null) {
        const normalizedData = this._normalizeData(data);
        const content = `${operation}:${userId || 'anonymous'}:${JSON.stringify(normalizedData)}`;
        
        return `${this.keyPrefix}${crypto
            .createHash('sha256')
            .update(content)
            .digest('hex')}`;
    }

    /**
     * Check if operation is already in progress or completed
     * @param {string} key - Idempotency key
     * @returns {Promise<{exists: boolean, result: any, inProgress: boolean}>}
     */
    async checkKey(key) {
        // Try Redis first
        const redisResult = await withRedisClient(async (client) => {
            try {
                // Check if key exists (operation in progress)
                const exists = await client.exists(key);
                
                // Check if result exists (operation completed)
                const resultKey = key.replace(this.keyPrefix, this.resultPrefix);
                const result = await client.get(resultKey);
                
                return {
                    exists: exists > 0,
                    result: result ? JSON.parse(result) : null,
                    inProgress: exists > 0 && !result
                };
            } catch (error) {
                logger.debug('Redis checkKey operation failed', { 
                    error: error.message, 
                    key: this._sanitizeKey(key) 
                });
                return null;
            }
        });

        if (redisResult) {
            return redisResult;
        }

        // Fallback to memory cache
        const exists = this.memoryCache.has(key);
        const resultKey = key.replace(this.keyPrefix, this.resultPrefix);
        const result = this.memoryCache.get(resultKey);
        
        return {
            exists,
            result: result || null,
            inProgress: exists && !result
        };
    }

    /**
     * Lock operation with idempotency key
     * @param {string} key - Idempotency key
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<boolean>} Success status
     */
    async lockOperation(key, ttl = this.defaultTTL) {
        // Try Redis first
        const redisResult = await withRedisClient(async (client) => {
            try {
                // Use SET NX (set if not exists) with expiration
                const result = await client.setNX(key, JSON.stringify({
                    timestamp: new Date().toISOString(),
                    status: 'in_progress'
                }));
                
                if (result) {
                    await client.expire(key, ttl);
                }
                
                return result;
            } catch (error) {
                logger.debug('Redis lockOperation failed', { 
                    error: error.message, 
                    key: this._sanitizeKey(key) 
                });
                return null;
            }
        });

        if (redisResult !== null) {
            return redisResult;
        }

        // Fallback to memory cache
        if (this.memoryCache.has(key)) {
            return false;
        }
        
        this.memoryCache.set(key, {
            timestamp: new Date().toISOString(),
            status: 'in_progress'
        });
        
        // Set expiration timer
        const timer = setTimeout(() => {
            this.memoryCache.delete(key);
            this.memoryCacheTimers.delete(key);
        }, ttl * 1000);
        
        this.memoryCacheTimers.set(key, timer);
        return true;
    }

    /**
     * Store operation result
     * @param {string} key - Idempotency key
     * @param {any} result - Operation result
     * @param {number} ttl - Time to live in seconds
     */
    async storeResult(key, result, ttl = this.defaultTTL) {
        const resultKey = key.replace(this.keyPrefix, this.resultPrefix);
        const resultData = {
            result,
            timestamp: new Date().toISOString(),
            status: 'completed'
        };

        // Try Redis first
        const redisSuccess = await withRedisClient(async (client) => {
            try {
                await client.setEx(
                    resultKey, 
                    ttl, 
                    JSON.stringify(resultData)
                );
                
                // Remove the lock key as operation is completed
                await client.del(key);
                return true;
            } catch (error) {
                logger.debug('Redis storeResult failed', { 
                    error: error.message, 
                    key: this._sanitizeKey(key) 
                });
                return false;
            }
        });

        if (redisSuccess) {
            logger.debug('Stored idempotency result in Redis', { 
                key: this._sanitizeKey(key),
                resultKey: this._sanitizeKey(resultKey)
            });
            return;
        }

        // Fallback to memory cache
        this.memoryCache.set(resultKey, resultData);
        
        // Clear existing timer for lock key
        if (this.memoryCacheTimers.has(key)) {
            clearTimeout(this.memoryCacheTimers.get(key));
            this.memoryCacheTimers.delete(key);
        }
        this.memoryCache.delete(key);
        
        // Set expiration timer for result
        const timer = setTimeout(() => {
            this.memoryCache.delete(resultKey);
            this.memoryCacheTimers.delete(resultKey);
        }, ttl * 1000);
        
        this.memoryCacheTimers.set(resultKey, timer);
        
        logger.debug('Stored idempotency result in memory cache', { 
            key: this._sanitizeKey(key),
            resultKey: this._sanitizeKey(resultKey)
        });
    }

    /**
     * Release lock (in case of operation failure)
     * @param {string} key - Idempotency key
     */
    async releaseLock(key) {
        // Try Redis first
        const redisSuccess = await withRedisClient(async (client) => {
            try {
                await client.del(key);
                return true;
            } catch (error) {
                logger.debug('Redis releaseLock failed', { 
                    error: error.message, 
                    key: this._sanitizeKey(key) 
                });
                return false;
            }
        });

        if (redisSuccess) {
            logger.debug('Released idempotency lock in Redis', { 
                key: this._sanitizeKey(key) 
            });
            return;
        }

        // Fallback to memory cache
        if (this.memoryCacheTimers.has(key)) {
            clearTimeout(this.memoryCacheTimers.get(key));
            this.memoryCacheTimers.delete(key);
        }
        this.memoryCache.delete(key);

        logger.debug('Released idempotency lock in memory cache', { 
            key: this._sanitizeKey(key) 
        });
    }

    /**
     * Execute operation with idempotency protection
     * @param {string} operation - Operation name
     * @param {Object} data - Request data
     * @param {Function} operationFn - Function to execute
     * @param {string} userId - User/Passenger ID
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<any>} Operation result
     */
    async executeWithIdempotency(operation, data, operationFn, userId = null, ttl = this.defaultTTL) {
        const key = this.generateKey(operation, data, userId);
        
        // Check if operation already exists
        const { exists, result, inProgress } = await this.checkKey(key);
        
        if (result) {
            logger.info('Returning cached idempotent result', { 
                operation, 
                userId, 
                key: this._sanitizeKey(key) 
            });
            return result.result;
        }
        
        if (inProgress) {
            // Wait a bit and check again (simple retry logic)
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { result: retryResult } = await this.checkKey(key);
            
            if (retryResult) {
                return retryResult.result;
            }
            
            throw new Error('Operation in progress, please try again later');
        }
        
        // Lock the operation
        const locked = await this.lockOperation(key, ttl);
        
        if (!locked) {
            throw new Error('Operation already in progress');
        }
        
        try {
            // Execute the operation
            const operationResult = await operationFn();
            
            // Store the result
            await this.storeResult(key, operationResult, ttl);
            
            logger.info('Operation completed with idempotency', { 
                operation, 
                userId, 
                key: this._sanitizeKey(key) 
            });
            
            return operationResult;
        } catch (error) {
            // Release lock on failure
            await this.releaseLock(key);
            throw error;
        }
    }

    /**
     * Normalize data for consistent key generation
     * @param {Object} data - Request data
     * @returns {Object} Normalized data
     */
    _normalizeData(data) {
        if (!data || typeof data !== 'object') return data;
        
        // Remove dynamic fields that shouldn't affect idempotency
        const exclude = [
            'timestamp', 'requestId', 'sessionId', 
            'createdAt', 'updatedAt', 'ip', 'userAgent'
        ];
        
        const normalized = {};
        Object.keys(data)
            .filter(key => !exclude.includes(key))
            .sort() // Sort keys for consistency
            .forEach(key => {
                if (typeof data[key] === 'object' && data[key] !== null) {
                    normalized[key] = this._normalizeData(data[key]);
                } else {
                    normalized[key] = data[key];
                }
            });
        
        return normalized;
    }

    /**
     * Sanitize key for logging (remove sensitive data)
     * @param {string} key - Idempotency key
     * @returns {string} Sanitized key
     */
    _sanitizeKey(key) {
        return key.substring(0, 20) + '...';
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        // Clean up memory cache timers
        if (this.memoryCacheTimers) {
            this.memoryCacheTimers.forEach(timer => clearTimeout(timer));
            this.memoryCacheTimers.clear();
        }
        
        if (this.memoryCache) {
            this.memoryCache.clear();
        }
        
        logger.info('IdempotencyHelper cleanup completed');
    }

    /**
     * Check if Redis is available
     * @returns {boolean}
     */
    isRedisAvailable() {
        return !!getClient();
    }
}

module.exports = new IdempotencyHelper();