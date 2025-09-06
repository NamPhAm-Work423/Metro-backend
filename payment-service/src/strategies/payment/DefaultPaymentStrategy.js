const IPaymentStrategy = require('./IPaymentStrategy');
const { createPayment } = require('../../services/payment.service');
const { logger } = require('../../config/logger');
const { publishTicketPaymentReadyNonPaypal } = require('../../events/payment.producer');

/**
 * Default Payment Strategy Implementation
 * Handles non-PayPal payment methods (test mode)
 */
class DefaultPaymentStrategy extends IPaymentStrategy {
    /**
     * Get payment method name
     * @returns {string} Payment method name
     */
    getPaymentMethod() {
        return 'default';
    }

    /**
     * Validate payment data
     * @param {Object} paymentData - Payment data to validate
     * @returns {boolean} True if valid, false otherwise
     */
    validatePaymentData(paymentData) {
        const { paymentId, ticketId, passengerId, amount, paymentMethod } = paymentData;
        
        if (!paymentId || !ticketId || !passengerId || !amount || !paymentMethod) {
            logger.error('Missing required fields for default payment', {
                hasPaymentId: !!paymentId,
                hasTicketId: !!ticketId,
                hasPassengerId: !!passengerId,
                hasAmount: !!amount,
                hasPaymentMethod: !!paymentMethod
            });
            return false;
        }

        if (amount <= 0) {
            logger.error('Invalid amount for default payment', { amount });
            return false;
        }

        return true;
    }

    /**
     * Process default payment (test mode)
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>} Payment result
     */
    async processPayment(paymentData) {
        if (!this.validatePaymentData(paymentData)) {
            throw new Error('Invalid payment data for default payment');
        }

        const { 
            paymentId, 
            ticketId, 
            passengerId, 
            amount, 
            paymentMethod, 
            ticketData, 
            ticketType 
        } = paymentData;

        try {
            // Create payment record in test mode
            const payment = await createPayment({
                paymentId,
                ticketId,
                passengerId,
                amount,
                paymentMethod,
                paymentStatus: 'COMPLETED',
                paymentGatewayResponse: {
                    ticketData,
                    ticketType,
                    testMode: true,
                    message: 'Payment completed in test mode'
                }
            });

            // Publish payment ready event
            await publishTicketPaymentReadyNonPaypal(ticketId, paymentId, paymentMethod);

            logger.info('Default payment processed successfully', {
                paymentId,
                ticketId,
                paymentMethod
            });

            return {
                success: true,
                paymentId,
                ticketId,
                payment,
                testMode: true
            };

        } catch (error) {
            logger.error('Database error processing default payment', {
                error: error.message,
                ticketId,
                paymentId
            });
            throw error;
        }
    }
}

module.exports = DefaultPaymentStrategy;
