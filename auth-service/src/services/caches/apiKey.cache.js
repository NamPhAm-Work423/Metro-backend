const { withRedisClient } = require('../../config/redis');
const { hashToken } = require('../../helpers/crypto.helper');
const { logger } = require('../../config/logger');

const AUTH_SERVICE_PREFIX = process.env.REDIS_KEY_PREFIX || 'auth-service:';

function formatAPIKey(key) {
  return `${AUTH_SERVICE_PREFIX}auth-cache:${key}`;
}

function formatSessionKey(userId, keyId) {
  return `${AUTH_SERVICE_PREFIX}session:${userId}:${keyId}`;
}

async function storeAPIKey(apiKey, metadata = {}, expirySeconds = 24 * 3600) {
  await withRedisClient(async (client) => {
    const hashKey = hashToken(apiKey, process.env.API_KEY_HASH_SECRET);
    const redisKey = formatAPIKey(hashKey);

    await client.hSet(redisKey, {
      createdAt: Date.now().toString(),
      metadata: JSON.stringify(metadata),
      originalKey: apiKey
    });
    await client.expire(redisKey, expirySeconds);

    logger.info('API key stored in Redis successfully', {
      redisKey: `${redisKey.substring(0, 20)}...`,
      expirySeconds
    });
  });
}

module.exports = {
  formatAPIKey,
  formatSessionKey,
  storeAPIKey,
};


