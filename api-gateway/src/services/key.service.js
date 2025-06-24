const { getClient, withRedisClient, setWithExpiry } = require('../config/redis');
const { hashToken } = require('../helpers/crypto.helper');
const { logger } = require('../config/logger');

const KEY_PREFIX = {
    API_KEY: 'api_key:',
}

function formatAPIKey(key) {
    return `${KEY_PREFIX.API_KEY}${key}`;
}

/**
 * Store API key in Redis with metadata and expiry
 * @param {string} apiKey - The raw API key to store
 * @param {Object} metadata - Additional metadata to store
 * @param {number} expirySeconds - Expiry time in seconds (default: 24 hours)
 */
async function storeAPIKey(apiKey, metadata = {}, expirySeconds = 24 * 3600) {
    try {
        await withRedisClient(async (client) => {
            const hashKey = hashToken(apiKey, process.env.HASH_SECRET);
            const redisKey = formatAPIKey(hashKey);
            
            await client.hSet(redisKey, {
                createdAt: Date.now().toString(),
                metadata: JSON.stringify(metadata),
                originalKey: apiKey // Store for validation
            });
            await client.expire(redisKey, expirySeconds);
            
            logger.info('API key stored in Redis successfully', { 
                redisKey: redisKey.substring(0, 20) + '...', 
                expirySeconds 
            });
        });
    } catch (error) {
        logger.error('Error storing API key in Redis:', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Validate API key by checking if it exists in Redis
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} - True if valid, false otherwise
 */
async function validateAPIKey(apiKey) {
    try {
        const hashKey = hashToken(apiKey, process.env.HASH_SECRET);
        const redisKey = formatAPIKey(hashKey);
        
        const data = await withRedisClient(async (client) => {
            return await client.hGetAll(redisKey);
        });
        
        if (!data || Object.keys(data).length === 0) {
            logger.warn('API key not found in Redis', { 
                redisKey: redisKey.substring(0, 20) + '...' 
            });
            return false;
        }
        
        logger.info('API key validated successfully from Redis', { 
            redisKey: redisKey.substring(0, 20) + '...',
            createdAt: data.createdAt 
        });
        
        return true;
        
    } catch (error) {
        logger.error('Error validating API key in Redis:', {
            error: error.message,
            stack: error.stack
        });
        return false;
    }
}

module.exports = { storeAPIKey, validateAPIKey };