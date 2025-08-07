/**
 * Interface for Ticket Validation operations
 * Following Interface Segregation Principle - clients should not be forced to depend on methods they don't use
 */
class ITicketValidator {
    /**
     * Validate ticket by ID
     * @param {string} ticketId - Ticket ID
     * @returns {Promise<Object>} Validation result
     */
    async validateTicket(ticketId) {
        throw new Error('Method not implemented');
    }

    /**
     * Validate ticket at gate
     * @param {string} ticketId - Ticket ID
     * @param {string} stationId - Station ID
     * @param {string} action - 'entry' or 'exit'
     * @returns {Promise<Object>} Validation result
     */
    async validateTicketAtGate(ticketId, stationId, action = 'entry') {
        throw new Error('Method not implemented');
    }

    /**
     * Validate ticket for entry
     * @param {string} ticketId - Ticket ID
     * @param {string} stationId - Station ID
     * @returns {Promise<Object>} Validation result
     */
    async validateEntry(ticketId, stationId) {
        throw new Error('Method not implemented');
    }

    /**
     * Validate ticket for exit
     * @param {string} ticketId - Ticket ID
     * @param {string} stationId - Station ID
     * @returns {Promise<Object>} Validation result
     */
    async validateExit(ticketId, stationId) {
        throw new Error('Method not implemented');
    }

    /**
     * Check if ticket is expired
     * @param {Object} ticket - Ticket object
     * @returns {boolean} True if expired
     */
    isExpired(ticket) {
        throw new Error('Method not implemented');
    }

    /**
     * Check if ticket is valid for use
     * @param {Object} ticket - Ticket object
     * @returns {boolean} True if valid
     */
    isValid(ticket) {
        throw new Error('Method not implemented');
    }

    /**
     * Validate ticket ownership
     * @param {string} ticketId - Ticket ID
     * @param {string} passengerId - Passenger ID
     * @returns {Promise<boolean>} True if owned by passenger
     */
    async validateOwnership(ticketId, passengerId) {
        throw new Error('Method not implemented');
    }
}

module.exports = ITicketValidator;
