/**
 * Interface for Ticket Repository operations
 * Following Interface Segregation Principle - clients should not be forced to depend on methods they don't use
 */
class ITicketRepository {
    /**
     * Create a new ticket
     * @param {Object} ticketData - Ticket data to create
     * @returns {Promise<Object>} Created ticket
     */
    async create(ticketData) {
        throw new Error('Method not implemented');
    }

    /**
     * Find ticket by ID
     * @param {string} ticketId - Ticket ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Ticket object
     */
    async findById(ticketId, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find all tickets with filters
     * @param {Object} filters - Filter criteria
     * @param {Object} options - Query options
     * @returns {Promise<Array>} List of tickets
     */
    async findAll(filters = {}, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find tickets by passenger ID
     * @param {string} passengerId - Passenger ID
     * @param {Object} filters - Filter criteria
     * @param {Object} options - Query options
     * @returns {Promise<Array>} List of tickets
     */
    async findByPassengerId(passengerId, filters = {}, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Find ticket by payment ID
     * @param {string} paymentId - Payment ID
     * @returns {Promise<Object>} Ticket object
     */
    async findByPaymentId(paymentId) {
        throw new Error('Method not implemented');
    }

    /**
     * Activate long-term ticket
     * @param {string} ticketId - Ticket ID
     * @returns {Promise<Object>} Activated ticket
     */
    async activateLongTermTicket(ticketId) {
        throw new Error('Method not implemented');
    }

    /**
     * Update ticket
     * @param {string} ticketId - Ticket ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated ticket
     */
    async update(ticketId, updateData) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete ticket (soft delete)
     * @param {string} ticketId - Ticket ID
     * @returns {Promise<boolean>} Deletion result
     */
    async delete(ticketId) {
        throw new Error('Method not implemented');
    }

    /**
     * Bulk update tickets
     * @param {Object} filters - Filter criteria
     * @param {Object} updateData - Data to update
     * @returns {Promise<number>} Number of updated tickets
     */
    async bulkUpdate(filters, updateData) {
        throw new Error('Method not implemented');
    }

    /**
     * Count tickets with filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<number>} Count of tickets
     */
    async count(filters = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Get ticket statistics
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} Ticket statistics
     */
    async getStatistics(filters = {}) {
        throw new Error('Method not implemented');
    }
}

module.exports = ITicketRepository;
