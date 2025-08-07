/**
 * Interface for Fare Service operations
 * Following Interface Segregation Principle - clients should not be forced to depend on methods they don't use
 */
class IFareService {
    /**
     * Create a new fare
     * @param {Object} fareData - Fare data to create
     * @returns {Promise<Object>} Created fare
     */
    async createFare(fareData) {
        throw new Error('Method not implemented');
    }

    /**
     * Get all fares with optional filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} List of fares
     */
    async getAllFares(filters = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Get fare by ID
     * @param {string} fareId - Fare ID
     * @returns {Promise<Object>} Fare object
     */
    async getFareById(fareId) {
        throw new Error('Method not implemented');
    }

    /**
     * Update fare
     * @param {string} fareId - Fare ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated fare
     */
    async updateFare(fareId, updateData) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete fare (soft delete)
     * @param {string} fareId - Fare ID
     * @returns {Promise<Object>} Deletion result
     */
    async deleteFare(fareId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get active fares
     * @returns {Promise<Array>} List of active fares
     */
    async getActiveFares() {
        throw new Error('Method not implemented');
    }

    /**
     * Get fare statistics
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} Fare statistics
     */
    async getFareStatistics(filters = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Bulk update fares
     * @param {Object} filters - Filter criteria
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Update result
     */
    async bulkUpdateFares(filters, updateData) {
        throw new Error('Method not implemented');
    }
}

module.exports = IFareService;
