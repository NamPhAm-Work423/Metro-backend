/**
 * Payment Strategy Interface
 * Defines the contract for all payment method implementations
 */
class IPaymentStrategy {
    /**
     * Process payment for a ticket
     * @param {Object} paymentData - Payment data
     * @param {string} paymentData.paymentId - Unique payment identifier
     * @param {string} paymentData.ticketId - Ticket identifier
     * @param {string} paymentData.passengerId - Passenger identifier
     * @param {number} paymentData.amount - Payment amount
     * @param {string} paymentData.currency - Payment currency
     * @param {Object} paymentData.ticketData - Additional ticket data
     * @param {string} paymentData.ticketType - Type of ticket
     * @returns {Promise<Object>} Payment result
     */
    async processPayment(paymentData) {
        throw new Error('processPayment method must be implemented');
    }

    /**
     * Get payment method name
     * @returns {string} Payment method name
     */
    getPaymentMethod() {
        throw new Error('getPaymentMethod method must be implemented');
    }

    /**
     * Validate payment data
     * @param {Object} paymentData - Payment data to validate
     * @returns {boolean} True if valid, false otherwise
     */
    validatePaymentData(paymentData) {
        throw new Error('validatePaymentData method must be implemented');
    }
}

module.exports = IPaymentStrategy;

