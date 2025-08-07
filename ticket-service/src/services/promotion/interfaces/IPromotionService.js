/**
 * Interface for Promotion Service operations
 * Following Interface Segregation Principle - clients should not be forced to depend on methods they don't use
 */
class IPromotionService {
    /**
     * Create a new promotion
     * @param {Object} promotionData - Promotion data to create
     * @returns {Promise<Object>} Created promotion
     */
    async createPromotion(promotionData) {
        throw new Error('Method not implemented');
    }

    /**
     * Get all promotions with optional filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} List of promotions
     */
    async getAllPromotions(filters = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Get promotion by ID
     * @param {string} promotionId - Promotion ID
     * @returns {Promise<Object>} Promotion object
     */
    async getPromotionById(promotionId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get promotion by code
     * @param {string} promotionCode - Promotion code
     * @returns {Promise<Object>} Promotion object
     */
    async getPromotionByCode(promotionCode) {
        throw new Error('Method not implemented');
    }

    /**
     * Update promotion
     * @param {string} promotionId - Promotion ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated promotion
     */
    async updatePromotion(promotionId, updateData) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete promotion
     * @param {string} promotionId - Promotion ID
     * @returns {Promise<Object>} Deletion result
     */
    async deletePromotion(promotionId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get active promotions
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} List of active promotions
     */
    async getActivePromotions(filters = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Get promotion statistics
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} Promotion statistics
     */
    async getPromotionStatistics(filters = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Expire promotions
     * @returns {Promise<number>} Number of expired promotions
     */
    async expirePromotions() {
        throw new Error('Method not implemented');
    }
}

module.exports = IPromotionService;
