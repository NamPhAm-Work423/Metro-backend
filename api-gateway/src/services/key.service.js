const { getClient, withRedisClient, setWithExpiry } = require('../config/redis');
const { hashToken, createAPIToken } = require('../helpers/crypto.helper');
const { logger } = require('../config/logger');
const Key = require('../models/key.model');

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
 * @returns {Object|null} - User metadata if valid, null otherwise
 */
async function validateAPIKey(apiKey) {
    try {
        const hashKey = hashToken(apiKey, process.env.HASH_SECRET);
        const redisKey = formatAPIKey(hashKey);
        
        // Step 1: Check Redis cache first
        const cachedData = await withRedisClient(async (client) => {
            return await client.hGetAll(redisKey);
        });

        // Cache Hit: Key found in Redis
        if (cachedData && Object.keys(cachedData).length > 0) {
            logger.info('API key validated successfully from Redis (Cache Hit)', { 
                redisKey: redisKey.substring(0, 20) + '...'
            });
            const metadata = cachedData.metadata ? JSON.parse(cachedData.metadata) : {};
            return {
                ...metadata,
                createdAt: cachedData.createdAt
            };
        }

        // Cache Miss: Key not in Redis, proceed to database fallback
        logger.warn('API key not found in Redis (Cache Miss), checking database...', { 
            redisKey: redisKey.substring(0, 20) + '...' 
        });

        // Step 2: Fallback to database
        const dbKey = await Key.findOne({
            where: {
                value: hashKey,
                status: 'activated'
            }
        });

        // Key not found in database either
        if (!dbKey) {
            logger.warn('Invalid API key: Not found in database either.', {
                hashKey: hashKey.substring(0, 20) + '...'
            });
            return null;
        }

        // Key found in database, it's valid.
        logger.info('API key validated successfully from Database (Fallback)', {
            keyId: dbKey.id,
            userId: dbKey.userId
        });

        // Step 3: Warm up the cache
        const metadataToCache = {
            userId: dbKey.userId,
            keyId: dbKey.id
        };
        
        await storeAPIKey(apiKey, metadataToCache);
        logger.info('Redis cache has been warmed for the API key.', { keyId: dbKey.id });

        // Return the metadata
        return metadataToCache;
        
    } catch (error) {
        logger.error('Error during API key validation process:', {
            error: error.message,
            stack: error.stack
        });
        return null;
    }
}

/**
 * Revoke all API keys for a user (for event-driven deletion)
 * @param {string} userId - User ID
 * @returns {number} Number of keys revoked
 */
async function revokeAllUserKeys(userId) {
    try {
        const result = await Key.update(
            { 
                status: 'expired'
            },
            { 
                where: { 
                    userId,
                    status: 'activated'
                }
            }
        );

        logger.info('All API keys revoked for user', { 
            userId, 
            keysRevoked: result[0] 
        });
        
        return result[0];

    } catch (error) {
        logger.error('Error revoking user API keys', {
            error: error.message,
            userId
        });
        throw error;
    }
}

/**
 * Get active API key for user - for auto-injection
 * Enhanced strategy: Use a secure session-based cache for API keys
 * @param {string} userId - The user ID
 * @returns {string|null} - Active API key if found, null otherwise
 */
async function getActiveAPIKeyForUser(userId) {
    try {
        // Strategy: Use Redis cache with session-based keys
        // This allows us to store the original API key temporarily per session
        
        const Key = require('../models/key.model');
        
        // Check if user has any active keys
        const existingKey = await Key.findOne({
            where: {
                userId: userId,
                status: 'activated',
            },
            order: [['createdAt', 'DESC']]
        });
        
        if (!existingKey) {
            logger.warn('No active API key found for user', { userId });
            return null;
        }

        // Check if we have a cached API key for this session
        const sessionCacheKey = `session_api_key:${userId}:${existingKey.id}`;
        
        logger.info('Checking cache for API key', {
            userId,
            keyId: existingKey.id,
            sessionCacheKey,
            cacheLookupAttempt: true
        });
        
        const cachedApiKey = await withRedisClient(async (client) => {
            return await client.get(sessionCacheKey);
        });

        logger.info('Cache lookup result', {
            userId,
            keyId: existingKey.id,
            sessionCacheKey,
            cacheHit: !!cachedApiKey,
            cachedKeyPrefix: cachedApiKey ? cachedApiKey.substring(0, 10) + '...' : 'null'
        });

        if (cachedApiKey) {
            // Update last used time
            await existingKey.update({ lastUsedAt: new Date() });
            
            logger.info('Using cached API key for auto-injection', { 
                userId, 
                keyId: existingKey.id 
            });
            return cachedApiKey;
        }

        // If no cached key, generate a new one and cache it for this session
        const { createAPIToken, hashToken } = require('../helpers/crypto.helper');
        const newApiToken = createAPIToken();
        const hashedToken = hashToken(newApiToken, process.env.HASH_SECRET);
        
        // Update the existing key record with new token
        await existingKey.update({
            value: hashedToken,
            lastUsedAt: new Date()
        });
        
        // Cache the API key for this session (24 hour expiry)
        await withRedisClient(async (client) => {
            await client.setEx(sessionCacheKey, 24 * 3600, newApiToken);
        });
        
        // Update Redis validation cache
        await storeAPIKey(newApiToken, { 
            userId: userId,
            keyId: existingKey.id 
        });
        
        logger.info('API key regenerated and cached for auto-injection', { 
            userId, 
            keyId: existingKey.id 
        });
        
        return newApiToken;
        
    } catch (error) {
        logger.error('Error getting active API key for user:', {
            error: error.message,
            stack: error.stack,
            userId: userId
        });
        return null;
    }
}

/**
 * Generate API key for user (used by controller)
 * @param {string} userId - User ID
 * @returns {Object} - Generated token and key ID
 */
async function generateAPIKeyForUser(userId) {
    try {
        const apiToken = createAPIToken();
        const hashedToken = hashToken(apiToken, process.env.API_KEY_HASH_SECRET);
        
        // Store in database for management
        const newKey = await Key.create({
            value: hashedToken,
            userId: userId,
            status: 'activated',
            lastUsedAt: new Date()
        });
        
        // Store in Redis for fast validation
        await storeAPIKey(apiToken, { 
            userId: userId,
            keyId: newKey.id 
        });
        
        logger.info('API key generated through service', { 
            userId, 
            keyId: newKey.id 
        });
        
        return {
            token: apiToken,
            keyId: newKey.id
        };
        
    } catch (error) {
        logger.error('Error generating API key for user:', {
            error: error.message,
            stack: error.stack,
            userId
        });
        throw error;
    }
}

/**
 * Get API keys by user ID (used by controller)
 * @param {string} userId - User ID
 * @returns {Array} - List of API keys
 */
async function getAPIKeysByUserId(userId) {
    try {
        const keys = await Key.findAll({
            where: {
                userId: userId,
                status: 'activated',
            },
        });
        
        logger.info('API keys retrieved through service', { 
            userId, 
            keyCount: keys.length 
        });
        
        return keys;
        
    } catch (error) {
        logger.error('Error getting API keys by user ID:', {
            error: error.message,
            stack: error.stack,
            userId
        });
        throw error;
    }
}

/**
 * Delete API key by ID (used by controller)
 * @param {string} keyId - Key ID
 * @returns {boolean} - Success status
 */
async function deleteAPIKeyById(keyId) {
    try {
        const deletedCount = await Key.destroy({
            where: {
                id: keyId,
            },
        });
        
        if (deletedCount > 0) {
            logger.info('API key deleted through service', { keyId, deletedCount });
            return true;
        } else {
            logger.warn('API key not found for deletion', { keyId });
            return false;
        }
        
    } catch (error) {
        logger.error('Error deleting API key by ID:', {
            error: error.message,
            stack: error.stack,
            keyId
        });
        throw error;
    }
}

module.exports = {
    storeAPIKey,
    validateAPIKey,
    revokeAllUserKeys,
    getActiveAPIKeyForUser,
    generateAPIKeyForUser,
    getAPIKeysByUserId,
    deleteAPIKeyById
};