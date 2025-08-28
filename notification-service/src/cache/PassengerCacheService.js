class PassengerCacheService {
    constructor(redisClient, logger, prefix = 'metrohcm:user-service:user:passenger:', ttl = 3600) {
        this.redis = redisClient;
        this.logger = logger;
        this.keyPrefix = prefix;
        this.defaultTTL = ttl;
        this.indexPrefix = `${prefix}index:`; // userId -> passengerId
        this.emailIndexPrefix = `${prefix}emailIndex:`; // email -> passengerId
    }

    _getCacheKey(passengerId) {
        return `${this.keyPrefix}${passengerId}`;
    }

    _getIndexKey(userId) {
        return `${this.indexPrefix}${userId}`;
    }

    _getEmailIndexKey(email) {
        return `${this.emailIndexPrefix}${email}`;
    }

    async setPassenger(passengerObj) {
        const { passengerId, userId, email } = passengerObj;
        if (!passengerId || !userId) {
            this.logger.warn('Missing passengerId or userId when setting passenger to cache.');
            return;
        }

        const key = this._getCacheKey(passengerId);
        const indexKey = this._getIndexKey(userId);
        const emailIndexKey = email ? this._getEmailIndexKey(email) : null;
        const payload = JSON.stringify({
            data: passengerObj,
            cachedAt: new Date().toISOString()
        });

        try {
            const pipeline = this.redis.multi();
            pipeline.set(key, payload, 'EX', this.defaultTTL);
            pipeline.set(indexKey, passengerId, 'EX', this.defaultTTL);
            if (emailIndexKey) {
                pipeline.set(emailIndexKey, passengerId, 'EX', this.defaultTTL);
            }
            await pipeline.exec();
        } catch (err) {
            this.logger.error('Failed to set passenger cache', { err });
        }
    }

    async getPassenger(passengerId) {
        const key = this._getCacheKey(passengerId);
        try {
            const raw = await this.redis.get(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed.data || null;
        } catch (err) {
            this.logger.warn('Failed to get/parse passenger cache', { passengerId, error: err.message });
            return null;
        }
    }

    async getPassengerByUserId(userId) {
        const indexKey = this._getIndexKey(userId);
        try {
            const passengerId = await this.redis.get(indexKey);
            if (!passengerId) return null;
            return await this.getPassenger(passengerId);
        } catch (err) {
            this.logger.warn('Failed to get passenger by userId', { userId, error: err.message });
            return null;
        }
    }

    async getPassengerByEmail(email) {
        const indexKey = this._getEmailIndexKey(email);
        try {
            const passengerId = await this.redis.get(indexKey);
            if (!passengerId) return null;
            return await this.getPassenger(passengerId);
        } catch (err) {
            this.logger.warn('Failed to get passenger by email', { email, error: err.message });
            return null;
        }
    }

    async hasPassenger(passengerId) {
        try {
            return await this.redis.exists(this._getCacheKey(passengerId)) === 1;
        } catch (err) {
            this.logger.error('Error checking passenger existence in cache', { passengerId, error: err.message });
            return false;
        }
    }

    async removePassenger(passengerId, userId, email) {
        const keys = [this._getCacheKey(passengerId)];
        if (userId) keys.push(this._getIndexKey(userId));
        if (email) keys.push(this._getEmailIndexKey(email));

        try {
            const deleted = await this.redis.del(...keys);
            return deleted > 0;
        } catch (err) {
            this.logger.error('Error removing passenger cache', { passengerId, userId, error: err.message });
            return false;
        }
    }

    async refreshPassengerTTL(passengerId, userId, ttl = this.defaultTTL) {
        try {
            const results = await Promise.all([
                this.redis.expire(this._getCacheKey(passengerId), ttl),
                userId ? this.redis.expire(this._getIndexKey(userId), ttl) : Promise.resolve(0)
            ]);
            return results.some(v => v === 1);
        } catch (err) {
            this.logger.error('Error refreshing TTL', { passengerId, userId, error: err.message });
            return false;
        }
    }

    async setPassengers(passengerMap = {}, ttl = this.defaultTTL) {
        const multi = this.redis.multi();
        const now = new Date().toISOString();

        for (const [passengerId, passengerObj] of Object.entries(passengerMap)) {
            const { userId, email } = passengerObj;
            if (!userId) continue;

            const key = this._getCacheKey(passengerId);
            const indexKey = this._getIndexKey(userId);
            const emailIndexKey = email ? this._getEmailIndexKey(email) : null;
            const payload = JSON.stringify({ data: passengerObj, cachedAt: now });

            multi.set(key, payload, 'EX', ttl);
            multi.set(indexKey, passengerId, 'EX', ttl);
            if (emailIndexKey) {
                multi.set(emailIndexKey, passengerId, 'EX', ttl);
            }
        }

        try {
            await multi.exec();
            return true;
        } catch (err) {
            this.logger.error('Error in batch setPassengers', { error: err.message });
            return false;
        }
    }
}

module.exports = PassengerCacheService;
