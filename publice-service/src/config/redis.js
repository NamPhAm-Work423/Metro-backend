const redis = require('redis');
const { logger } = require('./logger');

let client = null;

/**
 * Setup Redis client with proper configuration and error handling
 */
async function setupRedisClient() {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = process.env.REDIS_PORT || '6379';
    const user = process.env.REDIS_USER;
    const password = process.env.REDIS_PASSWORD;

    // Prefer explicit socket options to avoid inadvertent AUTH when no password is required
    const clientOptions = {
        socket: {
            host,
            port: Number(port),
        },
    };

    // Attach credentials only if provided
    if (typeof password === 'string' && password.length > 0) {
        clientOptions.password = password;
        if (user) clientOptions.username = user;
    }

    const redisClient = redis.createClient(clientOptions);

    redisClient.on('error', (err) => {
        logger.error('Redis Client Error', err);
        redisClient.removeAllListeners();
        redisClient.quit().catch(() => {});
        client = null;
    });

    redisClient.on('end', () => {
        logger.info('Redis connection ended');
        redisClient.removeAllListeners();
        redisClient.quit().catch(() => {});
        client = null;
    });

    redisClient.on('connect', () => {
        logger.info('Redis connected successfully', { host, port });
    });

    redisClient.on('ready', () => {
        logger.info('Redis client ready');
    });

    redisClient.on('reconnecting', () => {
        logger.warn('Redis reconnecting...');
    });

    await redisClient.connect();

    // Backwards-compatibility shim for legacy code using setex (node-redis v3)
    if (typeof redisClient.setex !== 'function') {
        redisClient.setex = async (key, seconds, value) => {
            return redisClient.set(key, value, { EX: seconds });
        };
    }

    client = redisClient;
    logger.info('Redis client setup completed');
}

/**
 * Get Redis client instance
 */
function getRedisClient() {
    return client;
}

/**
 * Check if Redis client is connected
 */
function isRedisConnected() {
    return client && client.isOpen;
}

/**
 * Ensure Redis connection is available
 */
async function ensureConnection() {
    if (!isRedisConnected()) {
        try {
            await setupRedisClient();
            return true;
        } catch (error) {
            logger.error('Failed to ensure Redis connection', { error: error.message });
            return false;
        }
    }
    return true;
}

/**
 * Execute Redis operation with automatic reconnection
 */
async function withRedisClient(operation) {
    const connected = await ensureConnection();
    
    if (!connected || !client) {
        logger.error('Redis client is not available');
        return null;
    }
    
    try {
        return await operation(client);
    } catch (error) {
        logger.warn('Redis operation failed', { error: error.message });
        return null;
    }
}

/**
 * Initialize Redis connection
 */
async function initializeRedis() {
    try {
        await setupRedisClient();
        logger.info('Redis initialization complete');
        return true;
    } catch (error) {
        logger.error('Redis initialization failed', { error: error.message });
        throw error;
    }
}

/**
 * Gracefully close Redis connection
 */
async function closeRedis() {
    if (client) {
        try {
            await client.quit();
            logger.info('Redis connection closed gracefully');
        } catch (error) {
            logger.error('Error closing Redis connection', { error: error.message });
        } finally {
            client = null;
        }
    }
}

/**
 * Get cache key with prefix
 */
function getCacheKey(key) {
    const prefix = process.env.REDIS_KEY_PREFIX || 'public_service_';
    return `${prefix}${key}`;
}

/**
 * Set cache with TTL
 */
async function setCache(key, value, ttlSeconds = 86400) {
    return withRedisClient(async (client) => {
        const cacheKey = getCacheKey(key);
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
        return await client.setEx(cacheKey, ttlSeconds, serializedValue);
    });
}

/**
 * Get cache value
 */
async function getCache(key) {
    return withRedisClient(async (client) => {
        const cacheKey = getCacheKey(key);
        const value = await client.get(cacheKey);
        if (value) {
            try {
                return JSON.parse(value);
            } catch {
                return value; // Return as string if not JSON
            }
        }
        return null;
    });
}

/**
 * Delete cache key
 */
async function deleteCache(key) {
    return withRedisClient(async (client) => {
        const cacheKey = getCacheKey(key);
        return await client.del(cacheKey);
    });
}

/**
 * Check if cache key exists
 */
async function hasCache(key) {
    return withRedisClient(async (client) => {
        const cacheKey = getCacheKey(key);
        const exists = await client.exists(cacheKey);
        return exists === 1;
    });
}

/**
 * Get cache TTL
 */
async function getCacheTTL(key) {
    return withRedisClient(async (client) => {
        const cacheKey = getCacheKey(key);
        return await client.ttl(cacheKey);
    });
}

/**
 * Set cache hash field
 */
async function setHashCache(key, field, value, ttlSeconds = 86400) {
    return withRedisClient(async (client) => {
        const cacheKey = getCacheKey(key);
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
        await client.hSet(cacheKey, field, serializedValue);
        await client.expire(cacheKey, ttlSeconds);
        return true;
    });
}

/**
 * Get cache hash field
 */
async function getHashCache(key, field) {
    return withRedisClient(async (client) => {
        const cacheKey = getCacheKey(key);
        const value = await client.hGet(cacheKey, field);
        if (value) {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        return null;
    });
}

/**
 * Get all hash fields
 */
async function getAllHashCache(key) {
    return withRedisClient(async (client) => {
        const cacheKey = getCacheKey(key);
        const hash = await client.hGetAll(cacheKey);
        const result = {};
        for (const [field, value] of Object.entries(hash)) {
            try {
                result[field] = JSON.parse(value);
            } catch {
                result[field] = value;
            }
        }
        return result;
    });
}

module.exports = {
    initializeRedis,
    closeRedis,
    getRedisClient,
    isRedisConnected,
    withRedisClient,
    getCacheKey,
    setCache,
    getCache,
    deleteCache,
    hasCache,
    getCacheTTL,
    setHashCache,
    getHashCache,
    getAllHashCache
}; 