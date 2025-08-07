/**
 * Interface for Promotion Validation operations
 * Following Interface Segregation Principle - separates validation concerns from CRUD operations
 */
class IPromotionValidator {
    /**
     * Validate promotion code
     * @param {string} promotionCode - Promotion code
     * @param {Object} validationData - Validation data
     * @returns {Promise<Object>} Validation result
     */
    async validatePromotion(promotionCode, validationData = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Apply promotion
     * @param {string} promotionCode - Promotion code
     * @param {Object} applicationData - Application data
     * @returns {Promise<Object>} Applied promotion
     */
    async applyPromotion(promotionCode, applicationData) {
        throw new Error('Method not implemented');
    }

    /**
     * Get promotion usage report
     * @param {string} promotionId - Promotion ID
     * @returns {Promise<Object>} Usage report
     */
    async getPromotionUsageReport(promotionId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get valid promotions for pass type
     * @param {string} passType - Pass type
     * @returns {Promise<Array>} Valid promotions
     */
    async getPassPromotions(passType) {
        throw new Error('Method not implemented');
    }

    /**
     * Apply promotion to pass upgrade
     * @param {string} promotionCode - Promotion code
     * @param {number} upgradeCost - Upgrade cost
     * @param {string} newPassType - New pass type
     * @returns {Promise<Object>} Applied promotion
     */
    async applyPassUpgradePromotion(promotionCode, upgradeCost, newPassType) {
        throw new Error('Method not implemented');
    }

    /**
     * Get promotions for route
     * @param {string} routeId - Route ID
     * @returns {Promise<Array>} Route promotions
     */
    async getRoutePromotions(routeId) {
        throw new Error('Method not implemented');
    }
}

module.exports = IPromotionValidator;
