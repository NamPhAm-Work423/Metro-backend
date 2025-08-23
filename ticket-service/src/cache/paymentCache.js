const { logger } = require('../config/logger');

/**
 * Shared payment cache for ticket service
 * This ensures payment data is consistently available across all modules
 */
class PaymentCache {
    constructor() {
        this.cache = new Map();
        this.cleanupInterval = null;
        this.startCleanup();
    }

    /**
     * Set payment data in cache
     * @param {string} key - Payment ID or ticket ID
     * @param {Object} data - Payment data
     */
    set(key, data) {
        const enrichedData = {
            ...data,
            timestamp: Date.now()
        };
        this.cache.set(key, enrichedData);
        
        logger.debug('Payment data cached', {
            key,
            hasPaymentUrl: !!data.paymentUrl,
            paymentMethod: data.paymentMethod,
            cacheSize: this.cache.size
        });
    }

    /**
     * Get payment data from cache
     * @param {string} key - Payment ID or ticket ID
     * @returns {Object|null} Payment data or null if not found
     */
    get(key) {
        const data = this.cache.get(key);
        if (data) {
            // Check if data is not too old (5 minutes)
            const age = Date.now() - data.timestamp;
            if (age < 300000) { // 5 minutes
                logger.debug('Payment data retrieved from cache', {
                    key,
                    age: Math.round(age / 1000) + 's',
                    hasPaymentUrl: !!data.paymentUrl
                });
                return data;
            } else {
                // Remove old data
                this.cache.delete(key);
                logger.debug('Expired payment data removed from cache', { key, age: Math.round(age / 1000) + 's' });
            }
        }
        return null;
    }

    /**
     * Delete payment data from cache
     * @param {string} key - Payment ID or ticket ID
     */
    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            logger.debug('Payment data deleted from cache', { key });
        }
        return deleted;
    }

    /**
     * Clear all cache data
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        logger.info('Payment cache cleared', { previousSize: size });
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * Start automatic cleanup of expired entries
     * @private
     */
    startCleanup() {
        // Only start cleanup in production to avoid test issues
        if (process.env.NODE_ENV === 'production') {
            // Clean up expired entries every 2 minutes
            this.cleanupInterval = setInterval(() => {
                const now = Date.now();
                let expiredCount = 0;
                
                for (const [key, data] of this.cache.entries()) {
                    const age = now - data.timestamp;
                    if (age > 300000) { // 5 minutes
                        this.cache.delete(key);
                        expiredCount++;
                    }
                }
                
                if (expiredCount > 0) {
                    logger.debug('Cleaned up expired payment cache entries', {
                        expiredCount,
                        remainingSize: this.cache.size
                    });
                }
            }, 120000); // Every 2 minutes
        }
    }

    /**
     * Stop automatic cleanup
     */
    stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            logger.debug('Payment cache cleanup stopped');
        }
    }
}

// Export singleton instance
const paymentCache = new PaymentCache();

module.exports = {
    paymentCache,
    PaymentCache
};
