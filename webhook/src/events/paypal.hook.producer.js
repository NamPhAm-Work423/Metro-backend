const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

/**
 * Paypal Hook Producer
 * Publishes paypal webhook events for payment service processing
 * Following Single Responsibility Principle (SRP)
 */
class PaypalHookProducer {
    constructor() {
        // Topic để gửi raw PayPal webhook events tới payment service
        this.webhookEventTopic = 'paypal.webhook.event';
        
        // Legacy topics for backward compatibility
        this.paymentCompletedTopic = 'paypal.payment.completed';
        this.paymentFailedTopic = 'paypal.payment.failed';
        this.refundCompletedTopic = 'paypal.refund.completed';
    }

    /**
     * Publish raw PayPal webhook event to payment service
     * @param {Object} webhookData - Raw PayPal webhook data
     * @returns {Promise<void>}
     */
    async publishWebhookEvent(webhookData) {
        try {
            const { eventData } = webhookData;
            const paypalOrderId = eventData.resource?.id;
            
            // Use paypalOrderId as message key for partitioning
            const messageKey = paypalOrderId || eventData.id;
            
            await publish(this.webhookEventTopic, messageKey, eventData);

            logger.info('PayPal webhook event published', {
                topic: this.webhookEventTopic,
                eventType: eventData.event_type,
                paypalOrderId: paypalOrderId,
                webhookId: eventData.id,
                messageKey
            });

            return {
                success: true,
                topic: this.webhookEventTopic,
                eventType: eventData.event_type,
                webhookId: eventData.id,
                messageKey
            };

        } catch (error) {
            logger.error('Failed to publish PayPal webhook event', {
                error: error.message,
                eventType: webhookData.eventData?.event_type,
                webhookId: webhookData.eventData?.id,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Publish paypal payment completed event
     * @param {Object} paymentData - Payment completion data
     * @returns {Promise<void>}
     */
    async publishPaymentCompleted(paymentData) {
        try {
            // Structure phù hợp với paypal.hook.consumer.js
            const payload = {
                ticketId: paymentData.ticketId,
                paymentId: paymentData.paymentId,
                passengerId: paymentData.userId || paymentData.passengerId,
                amount: paymentData.amount,
                ticketType: paymentData.ticketType,
                ticketData: paymentData.ticketData || {},
                paymentData: {
                    status: 'success',
                    provider: paymentData.provider || 'paypal',
                    orderId: paymentData.orderId,
                    currency: paymentData.currency,
                    customId: paymentData.customId,
                    timestamp: new Date().toISOString()
                }
            };

            await publish(this.paymentCompletedTopic, paymentData.ticketId, payload);

            logger.info('Paypal payment completed event published', {
                topic: this.paymentCompletedTopic,
                ticketId: paymentData.ticketId,
                paymentId: paymentData.paymentId,
                passengerId: payload.passengerId
            });

        } catch (error) {
            logger.error('Failed to publish paypal payment completed event', {
                error: error.message,
                paymentData,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Publish paypal payment failed event
     * @param {Object} paymentData - Payment failure data
     * @returns {Promise<void>}
     */
    async publishPaymentFailed(paymentData) {
        try {
            // Structure phù hợp với paypal.hook.consumer.js
            const payload = {
                ticketId: paymentData.ticketId,
                paymentId: paymentData.paymentId,
                passengerId: paymentData.userId || paymentData.passengerId,
                amount: paymentData.amount,
                ticketType: paymentData.ticketType,
                ticketData: paymentData.ticketData || {},
                paymentData: {
                    status: 'failed',
                    provider: paymentData.provider || 'paypal',
                    orderId: paymentData.orderId,
                    currency: paymentData.currency,
                    reason: paymentData.reason,
                    errorMessage: paymentData.errorMessage,
                    timestamp: new Date().toISOString()
                }
            };

            await publish(this.paymentFailedTopic, paymentData.ticketId, payload);

            logger.info('Paypal payment failed event published', {
                topic: this.paymentFailedTopic,
                ticketId: paymentData.ticketId,
                paymentId: paymentData.paymentId,
                reason: paymentData.reason
            });

        } catch (error) {
            logger.error('Failed to publish paypal payment failed event', {
                error: error.message,
                paymentData,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Publish paypal refund completed event
     * @param {Object} refundData - Refund completion data
     * @returns {Promise<void>}
     */
    async publishRefundCompleted(refundData) {
        try {
            const payload = {
                ticketId: refundData.ticketId,
                paymentId: refundData.paymentId,
                passengerId: refundData.userId || refundData.passengerId,
                amount: refundData.amount,
                ticketType: refundData.ticketType,
                ticketData: refundData.ticketData || {},
                refundData: {
                    refundId: refundData.refundId,
                    status: 'completed',
                    provider: refundData.provider || 'paypal',
                    orderId: refundData.orderId,
                    currency: refundData.currency,
                    reason: refundData.reason,
                    timestamp: new Date().toISOString()
                }
            };

            await publish(this.refundCompletedTopic, refundData.ticketId, payload);

            logger.info('Paypal refund completed event published', {
                topic: this.refundCompletedTopic,
                ticketId: refundData.ticketId,
                refundId: refundData.refundId,
                paymentId: refundData.paymentId
            });

        } catch (error) {
            logger.error('Failed to publish paypal refund completed event', {
                error: error.message,
                refundData,
                stack: error.stack
            });
            throw error;
        }
    }
}

// Create singleton instance
const paypalHookProducer = new PaypalHookProducer();

module.exports = {
    publishWebhookEvent: paypalHookProducer.publishWebhookEvent.bind(paypalHookProducer),
    publishPaymentCompleted: paypalHookProducer.publishPaymentCompleted.bind(paypalHookProducer),
    publishPaymentFailed: paypalHookProducer.publishPaymentFailed.bind(paypalHookProducer),
    publishRefundCompleted: paypalHookProducer.publishRefundCompleted.bind(paypalHookProducer)
};
