const { getClient, withRedisClient, setWithExpiry } = require('../config/redis');
const { hashToken } = require('../helpers/crypto.helper');

const KEY_PREFIX = {
    API_KEY: 'api_key:',
}

function formatAPIKey(key) {
    return `${KEY_PREFIX.API_KEY}${key}`;
}

/**
 * Store API key in Redis with metadata and expiry
 * @param {string} hashKey - The hashed API key
 * @param {Object} metadata - Additional metadata to store
 * @param {number} expirySeconds - Expiry time in seconds (default: 24 hours)
 */
async function storeAPIKey(hashKey, metadata = {}, expirySeconds = 24 * 3600) {
    await withRedisClient(async (client) => {
        const client = getClient();
        const formatHashKey = formatAPIKey(hashKey);
        await client.hSet(formatHashKey, {
            createdAt: Date.now().toString(),
            metadata: JSON.stringify(metadata),
        });
        await client.expire(formatHashKey, expirySeconds);
    });
}

/**
 * Validate API key by checking if it exists in Redis
 * @param {string} apiKey - The API key to validate
 * @returns {Object|null} - The metadata if valid, null otherwise
 */
async function validateAPIKey(apiKey) {
    const client = getClient();
    const hashKey = hashToken(apiKey, process.env.API_KEY_SECRET);
    const data = 
        (await withRedisClient(async (client) => {
            return await client.get(formatAPIKey(hashKey));
        })) || {};
    return Object.keys(data).length > 0 ? data : null;
}

module.exports = { storeAPIKey, validateAPIKey };