/**
 * Interface for Ticket Status Management operations
 * Following Interface Segregation Principle - separates status management from other ticket operations
 */
class ITicketStatusService {
    /**
     * Update ticket status with validation
     * @param {string} ticketId - Ticket ID
     * @param {string} newStatus - New status to set
     * @param {string} reason - Reason for status change (optional)
     * @param {string} updatedBy - User ID who is updating the status
     * @returns {Promise<Object>} Updated ticket
     */
    async updateTicketStatus(ticketId, newStatus, reason = null, updatedBy = null) {
        throw new Error('Method not implemented');
    }

    /**
     * Validate status transition
     * @param {string} currentStatus - Current ticket status
     * @param {string} newStatus - New status to transition to
     * @returns {boolean} Whether transition is valid
     */
    validateStatusTransition(currentStatus, newStatus) {
        throw new Error('Method not implemented');
    }

    /**
     * Get valid status transitions for a given status
     * @param {string} status - Current status
     * @returns {Array<string>} Array of valid next statuses
     */
    getValidTransitions(status) {
        throw new Error('Method not implemented');
    }

    /**
     * Get all valid ticket statuses
     * @returns {Array<string>} Array of all valid statuses
     */
    getValidStatuses() {
        throw new Error('Method not implemented');
    }
}

module.exports = ITicketStatusService;
