const IPaymentStrategy = require('./IPaymentStrategy');
const { createPaypalPayment, createPayment } = require('../../services/payment.service');
const { Payment } = require('../../models/index.model');
const { logger } = require('../../config/logger');
const {
    publishTicketPaymentReady,
    publishTicketPaymentReadyFallback
} = require('../../events/payment.producer');

/**
 * PayPal Payment Strategy Implementation
 * Handles PayPal-specific payment processing logic
 */
class PayPalPaymentStrategy extends IPaymentStrategy {
    constructor() {
        super();
        this.EXCHANGE_RATE = 26000; // VND to USD exchange rate
    }

    /**
     * Get payment method name
     * @returns {string} Payment method name
     */
    getPaymentMethod() {
        return 'paypal';
    }

    /**
     * Validate payment data for PayPal
     * @param {Object} paymentData - Payment data to validate
     * @returns {boolean} True if valid, false otherwise
     */
    validatePaymentData(paymentData) {
        const { paymentId, ticketId, passengerId, amount, ticketData } = paymentData;
        
        if (!paymentId || !ticketId || !passengerId || !amount) {
            logger.error('Missing required fields for PayPal payment', {
                hasPaymentId: !!paymentId,
                hasTicketId: !!ticketId,
                hasPassengerId: !!passengerId,
                hasAmount: !!amount
            });
            return false;
        }

        if (amount <= 0) {
            logger.error('Invalid amount for PayPal payment', { amount });
            return false;
        }

        return true;
    }

    /**
     * Convert VND to USD for PayPal
     * @param {number} amountVnd - Amount in VND
     * @returns {number} Amount in USD
     */
    convertVndToUsd(amountVnd) {
        const amountUsd = amountVnd / this.EXCHANGE_RATE;
        // PayPal only supports 2 decimal places for USD
        return Math.round(amountUsd * 100) / 100;
    }

    /**
     * Create PayPal payment order
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>} PayPal order result
     */
    async createPayPalOrder(paymentData) {
        const { paymentId, ticketId, passengerId, amount, ticketData, ticketType } = paymentData;
        
        const orderInfo = `Ticket payment for ${ticketType} - Ticket ID: ${ticketId}`;
        const processedAmount = this.convertVndToUsd(amount);
        const paypalCurrency = 'USD';

        logger.info('Creating PayPal payment', {
            originalAmount: amount,
            convertedAmount: processedAmount,
            currency: paypalCurrency,
            ticketId
        });

        const startTime = Date.now();
        const { paypalOrder, payment: paypalPayment } = await createPaypalPayment({
            paymentId,
            ticketId,
            passengerId,
            amount: processedAmount,
            orderInfo,
            currency: paypalCurrency,
            returnUrl: ticketData.paymentSuccessUrl,
            cancelUrl: ticketData.paymentCancelUrl || ticketData.paymentFailUrl
        });

        const paymentDuration = Date.now() - startTime;
        logger.info('PayPal payment creation completed', { 
            paymentDuration,
            ticketId 
        });

        return { paypalOrder, paypalPayment };
    }

    /**
     * Generate PayPal approval link
     * @param {Object} paypalOrder - PayPal order object
     * @returns {string} Approval link
     */
    generateApprovalLink(paypalOrder) {
        let approvalLink = paypalOrder.links?.find(link => link.rel === 'approve')?.href;
        
        if (!approvalLink) {
            const baseUrl = 'https://www.sandbox.paypal.com/checkoutnow';
            approvalLink = `${baseUrl}?token=${paypalOrder.id}`;
            
            if (!approvalLink || approvalLink.includes('undefined')) {
                const altBaseUrl = 'https://www.sandbox.paypal.com/webapps/checkout';
                approvalLink = `${altBaseUrl}?token=${paypalOrder.id}`;
            }
        }

        logger.info('PayPal approval link generated', {
            approvalLink,
            paypalOrderId: paypalOrder.id,
            hasLinks: !!paypalOrder.links,
            linksCount: paypalOrder.links?.length || 0
        });

        return approvalLink;
    }

    /**
     * Handle PayPal payment fallback
     * @param {Object} paymentData - Payment data
     * @param {Error} error - Original error
     * @returns {Promise<Object>} Fallback result
     */
    async handlePayPalFallback(paymentData, error) {
        const { paymentId, ticketId, passengerId, amount } = paymentData;
        
        logger.warn('PayPal request failed, falling back to test mode', {
            ticketId,
            paymentId,
            error: error.message
        });

        try {
            let existingPayment = await Payment.findOne({
                where: { paymentId }
            });

            const fallbackData = {
                error: 'PayPal authentication failed',
                fallbackMode: true,
                originalError: error.message
            };

            if (existingPayment) {
                existingPayment.paymentGatewayResponse = {
                    ...existingPayment.paymentGatewayResponse,
                    ...fallbackData
                };
                await existingPayment.save();
            } else {
                await createPayment({
                    paymentId,
                    ticketId,
                    passengerId,
                    amount: this.convertVndToUsd(amount),
                    paymentMethod: 'paypal',
                    paymentStatus: 'PENDING',
                    paymentGatewayResponse: fallbackData
                });
            }

            return { success: true, fallbackMode: true };
        } catch (dbError) {
            logger.error('Failed to create/update fallback payment record', {
                error: dbError.message,
                ticketId,
                paymentId
            });
            throw dbError;
        }
    }

    /**
     * Check if error is a PayPal timeout/network error
     * @param {Error} error - Error to check
     * @returns {boolean} True if it's a timeout/network error
     */
    isPayPalTimeoutError(error) {
        return error.message && (
            error.message.includes('timeout') || 
            error.message.includes('network') ||
            error.message.includes('Client Authentication failed')
        );
    }

    /**
     * Process PayPal payment
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>} Payment result
     */
    async processPayment(paymentData) {
        if (!this.validatePaymentData(paymentData)) {
            throw new Error('Invalid payment data for PayPal');
        }

        const { paymentId, ticketId, passengerId, amount } = paymentData;

        try {
            const { paypalOrder, paypalPayment } = await this.createPayPalOrder(paymentData);
            const approvalLink = this.generateApprovalLink(paypalOrder);

            // Publish payment ready event
            await publishTicketPaymentReady(
                ticketId, 
                paymentId, 
                passengerId, 
                this.convertVndToUsd(amount), 
                paypalOrder, 
                approvalLink
            );

            return {
                success: true,
                paymentId,
                ticketId,
                approvalLink,
                paypalOrder,
                paypalPayment
            };

        } catch (error) {
            logger.error('Failed to create PayPal payment', {
                error: error.message,
                ticketId,
                paymentId
            });

            if (this.isPayPalTimeoutError(error)) {
                await this.handlePayPalFallback(paymentData, error);
                
                // Publish fallback event
                await publishTicketPaymentReadyFallback(
                    ticketId, 
                    paymentId, 
                    passengerId, 
                    amount, 
                    null // No approval link in fallback mode
                );

                return {
                    success: true,
                    paymentId,
                    ticketId,
                    fallbackMode: true
                };
            }

            throw error;
        }
    }
}

module.exports = PayPalPaymentStrategy;
