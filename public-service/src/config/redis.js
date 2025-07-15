const redis = require('redis');
const { logger } = require('./logger');

let client = null;

async function setupRedisClient() {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = process.env.REDIS_PORT || '6379';
    const password = process.env.REDIS_PASSWORD;

    // Prefer explicit socket options to avoid inadvertent AUTH when no password is required
    const clientOptions = {
        socket: {
            host,
            port: Number(port),
        },
    };

    // Attach credentials only if provided - Redis in Docker only uses password
    if (typeof password === 'string' && password.length > 0) {
        clientOptions.password = password;
    }

    const redisClient = redis.createClient(clientOptions);

    redisClient.on('error', (err) => {
        logger.error('Redis Client Error', err);
        redisClient.removeAllListeners();
        redisClient.quit().catch(() => {});
        client = null;
    });

    redisClient.on('end', () => {
        redisClient.removeAllListeners();
        redisClient.quit().catch(() => {});
        client = null;
    });

    redisClient.on('connect', () => {
        logger.info('Redis connected');
    });

    await redisClient.connect();

    // Backwards-compatibility shim for legacy code using setex (node-redis v3)
    if (typeof redisClient.setex !== 'function') {
        redisClient.setex = async (key, seconds, value) => {
            return redisClient.set(key, value, { EX: seconds });
        };
    }

    client = redisClient;
}

async function tryConnect() {
    try {
        if (!client) {
            logger.info('Trying to connect to redis...');
            await setupRedisClient();
        }
        return !!client;
    } catch (error) {
        logger.error('Redis connection failed:', error.message);
        return false;
    }
}

async function initializeRedis() {
    try {
        await setupRedisClient();
        logger.info('Redis initialization complete');
        return true;
    } catch (error) {
        logger.error('Redis initialization failed:', error);
        throw error;
    }
}

async function withRedisClient(operation) {
    const connected = await tryConnect();
    
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

async function setWithExpiry(key, value, expirySeconds = 3600) {
    return await withRedisClient(async (client) => {
        if (!client) {
            logger.error('Redis client not available for setWithExpiry');
            return null;
        }
        
        try {
            // Using built-in SET with EX option
            await client.set(key, value, { EX: expirySeconds });
            logger.debug('Set key with expiry', { key, expirySeconds });
            return true;
        } catch (error) {
            logger.error('Failed to set key with expiry', { key, error: error.message });
            throw error;
        }
    });
}

function getClient() {
    return client;
}

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        if (client) {
            await client.quit();
            logger.info('Redis connection closed');
        }
    } catch (error) {
        logger.error('Error while closing Redis connection:', error);
    }
});

function isRedisConnected() {
    return client && client.isOpen;
}

async function closeRedis() {
    if (client) {
        try {
            await client.quit();
            logger.info('Redis connection closed gracefully');
        } catch (error) {
            logger.error('Error closing Redis connection:', error);
        } finally {
            client = null;
        }
    }
}

process.on('SIGTERM', async () => {
    try {
        if (client) {
            await client.quit();
            logger.info('Redis connection closed');
        }
    } catch (error) {
        logger.error('Error while closing Redis connection:', error);
    }
});

module.exports = { getClient, withRedisClient, setWithExpiry, initializeRedis, isRedisConnected, closeRedis }; 