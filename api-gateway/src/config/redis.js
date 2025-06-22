const redis = require('redis');

let client = null;
// let redisAvailable = false;
// const RECONNECT_INTERVAL = 30000;

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
        console.log('Redis Client Error', err);
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
        console.log('Redis connected');
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
            console.log('Trying to connect to redis...');
            await setupRedisClient();
        }
    } catch (error) {
        return false;
    }
}

async function initializeRedis() {
    try {
        await setupRedisClient();
        console.log('Redis initialization complete');
        return true;
    } catch (error) {
        console.error('Redis initialization failed:', error);
        throw error;
    }
}

async function withRedisClient(operation) {
    await tryConnect();
    try {
        return await operation();
    } catch (error) {
        console.warn('Redis operation failed:', error.message);
        return null;
    }
}

process.on('SIGINT', async () => {
    try {
        await client.quit();
        console.log('Redis connection closed');
    } catch (error) {
        console.error('Error while closing Redis connection:', error);
    } finally {
        process.exit();
    }
});

process.on('SIGTERM', async () => {
    try {
        await client.quit();
        console.log('Redis connection closed');
    } catch (error) {
        console.error('Error while closing Redis connection:', error);
    } finally {
        process.exit();
    }
});

async function setWithExpiry(key, value, expirySeconds = 3600) {
    return await withRedisClient(async () => {
        // Using built-in SET with EX option
        await client.set(key, value, { EX: expirySeconds });
    });
}

function getClient() {
    return client;
}

module.exports = { getClient, withRedisClient, setWithExpiry, initializeRedis };
