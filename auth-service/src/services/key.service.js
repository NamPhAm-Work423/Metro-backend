const { withRedisClient } = require('../config/redis');
const { hashToken, createAPIToken } = require('../helpers/crypto.helper');
const { logger } = require('../config/logger');
const defaultKeyRepository = require('./repositories/key.repository');
const { formatAPIKey, formatSessionKey, storeAPIKey } = require('./caches/apiKey.cache');

// -----------------------------------------------------------------------------
// Redis key prefixing following clean tree structure
// -----------------------------------------------------------------------------
// delegated to cache module

// storeAPIKey is imported from caches/apiKey.cache

class KeyService {
  constructor({ keyRepository } = {}) {
    this.keyRepository = keyRepository || defaultKeyRepository;
  }

  async validateAPIKey(apiKey) {
    try {
      const hashKey = hashToken(apiKey, process.env.API_KEY_HASH_SECRET);
      const redisKey = formatAPIKey(hashKey);

      const cachedData = await withRedisClient(async (client) => client.hGetAll(redisKey));

      if (cachedData && Object.keys(cachedData).length > 0) {
        logger.info('API key validated successfully from Redis (Cache Hit)', { redisKey: `${redisKey.substring(0, 20)}...` });
        const metadata = cachedData.metadata ? JSON.parse(cachedData.metadata) : {};
        return { ...metadata, createdAt: cachedData.createdAt };
      }

      logger.warn('API key not found in Redis (Cache Miss), checking database...', { redisKey: `${redisKey.substring(0, 20)}...` });

      const dbKey = await this.keyRepository.findActiveByHashedValue(hashKey);
      if (!dbKey) {
        logger.warn('Invalid API key: Not found in database either.', { hashKey: `${hashKey.substring(0, 20)}...` });
        return null;
      }

      logger.info('API key validated successfully from Database (Fallback)', { keyId: dbKey.id, userId: dbKey.userId });

      const metadataToCache = { userId: dbKey.userId, keyId: dbKey.id };
      await storeAPIKey(apiKey, metadataToCache);
      logger.info('Redis cache has been warmed for the API key.', { keyId: dbKey.id });

      return metadataToCache;
    } catch (error) {
      logger.error('Error during API key validation process:', { error: error.message, stack: error.stack });
      return null;
    }
  }

  async revokeAllUserKeys(userId) {
    try {
      const revokedCount = await this.keyRepository.expireAllByUserId(userId);
      logger.info('All API keys revoked for user', { userId, keysRevoked: revokedCount });
      return revokedCount;
    } catch (error) {
      logger.error('Error revoking user API keys', { error: error.message, userId });
      throw error;
    }
  }

  async getActiveAPIKeyForUser(userId) {
    try {
      const existingKey = await this.keyRepository.findLatestActiveByUserId(userId);
      if (!existingKey) {
        logger.warn('No active API key found for user', { userId });
        return null;
      }

      const sessionCacheKey = formatSessionKey(userId, existingKey.id);
      logger.info('Checking cache for API key', { userId, keyId: existingKey.id, sessionCacheKey, cacheLookupAttempt: true });

      const cachedApiKey = await withRedisClient(async (client) => client.get(sessionCacheKey));
      logger.info('Cache lookup result', {
        userId,
        keyId: existingKey.id,
        sessionCacheKey,
        cacheHit: !!cachedApiKey,
        cachedKeyPrefix: cachedApiKey ? `${cachedApiKey.substring(0, 10)}...` : 'null'
      });

      if (cachedApiKey) {
        await this.keyRepository.updateLastUsedAt(existingKey.id, new Date());
        logger.info('Using cached API key for auto-injection', { userId, keyId: existingKey.id });
        return cachedApiKey;
      }

      const newApiToken = createAPIToken();
      const hashedToken = hashToken(newApiToken, process.env.API_KEY_HASH_SECRET);
      await this.keyRepository.updateValueAndLastUsed(existingKey.id, hashedToken, new Date());

      await withRedisClient(async (client) => client.setEx(sessionCacheKey, 24 * 3600, newApiToken));
      await storeAPIKey(newApiToken, { userId, keyId: existingKey.id });
      logger.info('API key regenerated and cached for auto-injection', { userId, keyId: existingKey.id });
      return newApiToken;
    } catch (error) {
      logger.error('Error getting active API key for user:', { error: error.message, stack: error.stack, userId });
      return null;
    }
  }

  async generateAPIKeyForUser(userId) {
    try {
      const apiToken = createAPIToken();
      const hashedToken = hashToken(apiToken, process.env.API_KEY_HASH_SECRET);
      const newKey = await this.keyRepository.createKey(userId, hashedToken);
      await storeAPIKey(apiToken, { userId, keyId: newKey.id });
      logger.info('API key generated through service', { userId, keyId: newKey.id });
      return { token: apiToken, keyId: newKey.id };
    } catch (error) {
      logger.error('Error generating API key for user:', { error: error.message, stack: error.stack, userId });
      throw error;
    }
  }

  async getAPIKeysByUserId(userId) {
    try {
      const keys = await this.keyRepository.findActiveByUserId(userId);
      logger.info('API keys retrieved through service', { userId, keyCount: keys.length });
      return keys;
    } catch (error) {
      logger.error('Error getting API keys by user ID:', { error: error.message, stack: error.stack, userId });
      throw error;
    }
  }

  async deleteAPIKeyById(keyId) {
    try {
      const deletedCount = await this.keyRepository.deleteById(keyId);
      if (deletedCount > 0) {
        logger.info('API key deleted through service', { keyId, deletedCount });
        return true;
      }
      logger.warn('API key not found for deletion', { keyId });
      return false;
    } catch (error) {
      logger.error('Error deleting API key by ID:', { error: error.message, stack: error.stack, keyId });
      throw error;
    }
  }
}

const keyService = new KeyService({ keyRepository: defaultKeyRepository });

module.exports = keyService;
// Preserve existing named import used by seed script
module.exports.storeAPIKey = storeAPIKey;