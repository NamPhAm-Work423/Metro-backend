const redis = require('redis');
const { logger } = require('./logger');

let client = null;

async function setupRedisClient() {
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
        return;
    }

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
    await tryConnect();
    
    if (!client) {
        logger.error('Redis client is not available');
        return null;
    }
    
    try {
        return await operation(client);
    } catch (error) {
        logger.warn('Redis operation failed:', error.message);
        return null;
    }
}

async function setWithExpiry(key, value, expirySeconds = 3600) {
    return await withRedisClient(async (client) => {
        // Using built-in SET with EX option
        await client.set(key, value, { EX: expirySeconds });
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

module.exports = { getClient, withRedisClient, setWithExpiry, initializeRedis }; 