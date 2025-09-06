const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

/**
 * Sepay Hook Producer
 * Publishes Sepay webhook events for payment service processing
 * Following Single Responsibility Principle (SRP)
 */
class SepayHookProducer {
    constructor() {
        // Topic to send raw Sepay webhook events to payment service
        this.webhookEventTopic = 'sepay.webhook.event';
        
        // Legacy topics for backward compatibility
        this.paymentCompletedTopic = 'sepay.payment.completed';
        this.paymentFailedTopic = 'sepay.payment.failed';
        this.paymentPendingTopic = 'sepay.payment.pending';
        this.refundCompletedTopic = 'sepay.refund.completed';
    }

    /**
     * Publish raw Sepay webhook event to payment service
     * @param {Object} webhookData - Raw Sepay webhook data
     * @returns {Promise<void>}
     */
    async publishWebhookEvent(webhookData) {
        try {
            const { eventData } = webhookData;
            const sepayTransactionId = eventData.resource?.id || eventData.transaction_id;
            
            // Use sepayTransactionId as message key for partitioning
            const messageKey = sepayTransactionId || eventData.id;
            
            await publish(this.webhookEventTopic, messageKey, eventData);

            logger.info('Sepay webhook event published', {
                topic: this.webhookEventTopic,
                eventType: eventData.event_type,
                sepayTransactionId: sepayTransactionId,
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
            logger.error('Failed to publish Sepay webhook event', {
                error: error.message,
                eventType: webhookData.eventData?.event_type,
                webhookId: webhookData.eventData?.id,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Publish Sepay payment completed event
     * @param {Object} paymentData - Payment completion data
     * @returns {Promise<void>}
     */
    async publishPaymentCompleted(paymentData) {
        try {
            // Structure compatible with sepay.hook.consumer.js
            const payload = {
                ticketId: paymentData.ticketId,
                paymentId: paymentData.paymentId,
                transactionId: paymentData.transactionId,
                passengerId: paymentData.userId || paymentData.passengerId,
                amount: paymentData.amount,
                ticketType: paymentData.ticketType,
                ticketData: paymentData.ticketData || {},
                paymentData: {
                    status: 'success',
                    provider: paymentData.provider || 'sepay',
                    orderId: paymentData.orderId,
                    currency: paymentData.currency,
                    customId: paymentData.customId,
                    sepayTransactionHash: paymentData.sepayTransactionHash,
                    sepayBlockNumber: paymentData.sepayBlockNumber,
                    sepayNetwork: paymentData.sepayNetwork,
                    timestamp: new Date().toISOString()
                }
            };

            await publish(this.paymentCompletedTopic, paymentData.ticketId, payload);

            logger.info('Sepay payment completed event published', {
                topic: this.paymentCompletedTopic,
                ticketId: paymentData.ticketId,
                paymentId: paymentData.paymentId,
                transactionId: paymentData.transactionId,
                passengerId: payload.passengerId
            });

        } catch (error) {
            logger.error('Failed to publish Sepay payment completed event', {
                error: error.message,
                paymentData,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Publish Sepay payment failed event
     * @param {Object} paymentData - Payment failure data
     * @returns {Promise<void>}
     */
    async publishPaymentFailed(paymentData) {
        try {
            // Structure compatible with sepay.hook.consumer.js
            const payload = {
                ticketId: paymentData.ticketId,
                paymentId: paymentData.paymentId,
                transactionId: paymentData.transactionId,
                passengerId: paymentData.userId || paymentData.passengerId,
                amount: paymentData.amount,
                ticketType: paymentData.ticketType,
                ticketData: paymentData.ticketData || {},
                paymentData: {
                    status: 'failed',
                    provider: paymentData.provider || 'sepay',
                    orderId: paymentData.orderId,
                    currency: paymentData.currency,
                    reason: paymentData.reason,
                    errorMessage: paymentData.errorMessage,
                    sepayTransactionHash: paymentData.sepayTransactionHash,
                    timestamp: new Date().toISOString()
                }
            };

            await publish(this.paymentFailedTopic, paymentData.ticketId, payload);

            logger.info('Sepay payment failed event published', {
                topic: this.paymentFailedTopic,
                ticketId: paymentData.ticketId,
                paymentId: paymentData.paymentId,
                transactionId: paymentData.transactionId,
                reason: paymentData.reason
            });

        } catch (error) {
            logger.error('Failed to publish Sepay payment failed event', {
                error: error.message,
                paymentData,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Publish Sepay payment pending event
     * @param {Object} paymentData - Payment pending data
     * @returns {Promise<void>}
     */
    async publishPaymentPending(paymentData) {
        try {
            const payload = {
                ticketId: paymentData.ticketId,
                paymentId: paymentData.paymentId,
                transactionId: paymentData.transactionId,
                passengerId: paymentData.userId || paymentData.passengerId,
                amount: paymentData.amount,
                ticketType: paymentData.ticketType,
                ticketData: paymentData.ticketData || {},
                paymentData: {
                    status: 'pending',
                    provider: paymentData.provider || 'sepay',
                    orderId: paymentData.orderId,
                    currency: paymentData.currency,
                    sepayTransactionHash: paymentData.sepayTransactionHash,
                    sepayBlockNumber: paymentData.sepayBlockNumber,
                    sepayNetwork: paymentData.sepayNetwork,
                    timestamp: new Date().toISOString()
                }
            };

            await publish(this.paymentPendingTopic, paymentData.ticketId, payload);

            logger.info('Sepay payment pending event published', {
                topic: this.paymentPendingTopic,
                ticketId: paymentData.ticketId,
                paymentId: paymentData.paymentId,
                transactionId: paymentData.transactionId,
                passengerId: payload.passengerId
            });

        } catch (error) {
            logger.error('Failed to publish Sepay payment pending event', {
                error: error.message,
                paymentData,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Publish Sepay refund completed event
     * @param {Object} refundData - Refund completion data
     * @returns {Promise<void>}
     */
    async publishRefundCompleted(refundData) {
        try {
            const payload = {
                ticketId: refundData.ticketId,
                paymentId: refundData.paymentId,
                transactionId: refundData.transactionId,
                refundId: refundData.refundId,
                passengerId: refundData.userId || refundData.passengerId,
                amount: refundData.amount,
                ticketType: refundData.ticketType,
                ticketData: refundData.ticketData || {},
                refundData: {
                    refundId: refundData.refundId,
                    status: 'completed',
                    provider: refundData.provider || 'sepay',
                    orderId: refundData.orderId,
                    currency: refundData.currency,
                    reason: refundData.reason,
                    sepayTransactionHash: refundData.sepayTransactionHash,
                    timestamp: new Date().toISOString()
                }
            };

            await publish(this.refundCompletedTopic, refundData.ticketId, payload);

            logger.info('Sepay refund completed event published', {
                topic: this.refundCompletedTopic,
                ticketId: refundData.ticketId,
                refundId: refundData.refundId,
                paymentId: refundData.paymentId,
                transactionId: refundData.transactionId
            });

        } catch (error) {
            logger.error('Failed to publish Sepay refund completed event', {
                error: error.message,
                refundData,
                stack: error.stack
            });
            throw error;
        }
    }
}

// Create singleton instance
const sepayHookProducer = new SepayHookProducer();

module.exports = {
    publishWebhookEvent: sepayHookProducer.publishWebhookEvent.bind(sepayHookProducer),
    publishPaymentCompleted: sepayHookProducer.publishPaymentCompleted.bind(sepayHookProducer),
    publishPaymentFailed: sepayHookProducer.publishPaymentFailed.bind(sepayHookProducer),
    publishPaymentPending: sepayHookProducer.publishPaymentPending.bind(sepayHookProducer),
    publishRefundCompleted: sepayHookProducer.publishRefundCompleted.bind(sepayHookProducer)
};



