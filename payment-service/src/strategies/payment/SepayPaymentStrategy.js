const IPaymentStrategy = require('./IPaymentStrategy');
const SepayService = require('../../services/sepay.service');
const { Payment } = require('../../models/index.model');
const { logger } = require('../../config/logger');
const { publishTicketPaymentReadySepay } = require('../../events/producers/sepay.producer');

/**
 * Sepay Payment Strategy Implementation
 * Handles Sepay QR code payment processing
 */
class SepayPaymentStrategy extends IPaymentStrategy {
    /**
     * Get payment method name
     * @returns {string} Payment method name
     */
    getPaymentMethod() {
        return 'sepay';
    }

    /**
     * Validate payment data for Sepay
     * @param {Object} paymentData - Payment data to validate
     * @returns {boolean} True if valid, false otherwise
     */
    validatePaymentData(paymentData) {
        const { paymentId, ticketId, passengerId, amount, ticketData } = paymentData;
        
        if (!paymentId || !ticketId || !passengerId || !amount) {
            logger.error('Missing required fields for Sepay payment', {
                hasPaymentId: !!paymentId,
                hasTicketId: !!ticketId,
                hasPassengerId: !!passengerId,
                hasAmount: !!amount
            });
            return false;
        }

        if (amount <= 0) {
            logger.error('Invalid amount for Sepay payment', { amount });
            return false;
        }

        // Sepay requires VND currency
        if (paymentData.currency && paymentData.currency !== 'VND') {
            logger.error('Sepay only supports VND currency', { 
                currency: paymentData.currency 
            });
            return false;
        }

        return true;
    }

    /**
     * Process Sepay payment
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>} Payment result
     */
    async processPayment(paymentData) {
        if (!this.validatePaymentData(paymentData)) {
            throw new Error('Invalid payment data for Sepay payment');
        }

        const { 
            paymentId, 
            ticketId, 
            passengerId, 
            amount, 
            ticketData, 
            ticketType,
            orderDescription 
        } = paymentData;

        try {
            // Create Sepay QR payment (this already creates a Payment + PaymentLog PENDING)
            const sepayResult = await SepayService.createQr({
                paymentId,
                ticketId,
                passengerId,
                amountVnd: amount,
                orderDescription: orderDescription || `Payment for ticket ${ticketId}`
            });

            // Update existing payment with gateway response/metadata
            await Payment.update({
                paymentMethod: 'sepay',
                paymentStatus: 'PENDING',
                paymentGatewayResponse: {
                    sepayResult,
                    ticketData,
                    ticketType,
                    qrImageUrl: sepayResult.qrImage
                }
            }, { where: { paymentId } });

            const payment = await Payment.findByPk(paymentId);

            logger.info('Sepay payment initiated successfully', {
                paymentId,
                ticketId,
                passengerId,
                amount,
                qrImageUrl: sepayResult.qrImage
            });

            // Proactively publish ticket.payment_ready with QR URL so ticket-service can surface it
            try {
                await publishTicketPaymentReadySepay(ticketId, paymentId, sepayResult.qrImage);
            } catch (pubErr) {
                logger.warn('Failed to publish ticket.payment_ready for Sepay', {
                    paymentId,
                    ticketId,
                    error: pubErr.message
                });
            }

            return {
                success: true,
                paymentId,
                ticketId,
                payment,
                sepayResult,
                qrImageUrl: sepayResult.qrImage,
                message: 'Sepay QR code generated successfully. Please scan to complete payment.'
            };

        } catch (error) {
            logger.error('Error processing Sepay payment', {
                error: error.message,
                ticketId,
                paymentId,
                amount
            });
            throw error;
        }
    }

    /**
     * Handle Sepay payment completion (called from webhook)
     * @param {Object} webhookData - Webhook payload from Sepay
     * @returns {Promise<Object>} Processing result
     */
    async handlePaymentCompletion(webhookData) {
        try {
            const result = await SepayService.handleWebhook(webhookData);
            
            if (result.ok) {
                // Publish payment ready event for ticket activation
                const paymentId = webhookData.description;
                if (paymentId) {
                    await publishTicketPaymentReadyNonPaypal(null, paymentId, 'sepay');
                    
                    logger.info('Sepay payment completed and ticket activated', {
                        paymentId,
                        transactionId: webhookData.transaction_id
                    });
                }
            }

            return result;
        } catch (error) {
            logger.error('Error handling Sepay payment completion', {
                error: error.message,
                webhookData
            });
            throw error;
        }
    }
}

module.exports = SepayPaymentStrategy;
