/**
 * Interface for Ticket Service operations
 * Following Interface Segregation Principle - clients should not be forced to depend on methods they don't use
 */
class ITicketService {
    /**
     * Create a short-term ticket (oneway or return)
     * @param {Object} ticketData - The ticket data
     * @returns {Promise<Object>} Created ticket with payment information
     */
    async createShortTermTicket(ticketData) {
        throw new Error('Method not implemented');
    }

    /**
     * Create a long-term ticket (pass-based)
     * @param {Object} ticketData - The ticket data
     * @returns {Promise<Object>} Created ticket with payment information
     */
    async createLongTermTicket(ticketData) {
        throw new Error('Method not implemented');
    }


    /**
     * Get all tickets with optional filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} List of tickets
     */
    async getAllTickets(filters = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Get ticket by ID
     * @param {string} ticketId - Ticket ID
     * @returns {Promise<Object>} Ticket object
     */
    async getTicketById(ticketId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get tickets by passenger ID
     * @param {string} passengerId - Passenger ID
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} List of tickets
     */
    async getTicketsByPassenger(passengerId, filters = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Get active tickets by passenger ID
     * @param {string} passengerId - Passenger ID
     * @returns {Promise<Array>} List of active tickets
     */
    async getActiveTicketsByPassenger(passengerId) {
        throw new Error('Method not implemented');
    }

    /**
     * Activate long-term ticket (start countdown)
     * @param {string} ticketId - Ticket ID
     * @param {string} passengerId - Passenger ID (optional, for validation)
     * @returns {Promise<Object>} Activated ticket
     */
    async activateTicket(ticketId, passengerId = null) {
        throw new Error('Method not implemented');
    }

    /**
     * Update ticket
     * @param {string} ticketId - Ticket ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated ticket
     */
    async updateTicket(ticketId, updateData) {
        throw new Error('Method not implemented');
    }

    /**
     * Cancel ticket
     * @param {string} ticketId - Ticket ID
     * @param {string} reason - Cancellation reason
     * @param {string} passengerId - Passenger ID (optional)
     * @returns {Promise<Object>} Cancelled ticket
     */
    async cancelTicket(ticketId, reason = 'Passenger cancellation', passengerId = null) {
        throw new Error('Method not implemented');
    }

    /**
     * Validate ticket
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
     * Send ticket to phone
     * @param {string} ticketId - Ticket ID
     * @param {string} phoneNumber - Phone number
     * @param {string} passengerId - Passenger ID
     * @returns {Promise<Object>} Send result
     */
    async sendTicketToPhone(ticketId, phoneNumber, passengerId) {
        throw new Error('Method not implemented');
    }

    /**
     * Send ticket to email
     * @param {string} ticketId - Ticket ID
     * @param {string} email - Email address
     * @param {string} passengerId - Passenger ID
     * @returns {Promise<Object>} Send result
     */
    async sendTicketToEmail(ticketId, email, passengerId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get ticket with QR code
     * @param {string} ticketId - Ticket ID
     * @param {string} passengerId - Passenger ID
     * @returns {Promise<Object>} Ticket with QR code
     */
    async getTicketWithQR(ticketId, passengerId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get ticket by payment ID
     * @param {string} paymentId - Payment ID
     * @returns {Promise<Object>} Ticket object
     */
    async getTicketByPaymentId(paymentId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get ticket statistics
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} Ticket statistics
     */
    async getTicketStatistics(filters = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Expire tickets (batch operation)
     * @returns {Promise<number>} Number of expired tickets
     */
    async expireTickets() {
        throw new Error('Method not implemented');
    }
}

module.exports = ITicketService;
