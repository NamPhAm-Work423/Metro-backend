const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

// PayPal-specific publishers moved to events/producers/paypal.producer.js

/**
 * Publish payment.completed event
 * @param {string} paymentId - Payment ID
 * @param {string} ticketId - Ticket ID  
 * @param {string} passengerId - Passenger ID
 * @param {number} amount - Payment amount
 * @param {string} paymentMethod - Payment method
 * @param {Object} paymentData - Additional payment data (optional)
 */
async function publishPaymentCompleted(paymentId, ticketId, passengerId, amount, paymentMethod, paymentData = {}) {
    try {
        await publish('payment.completed', paymentId, {
            paymentId: paymentId,
            ticketId: ticketId,
            passengerId: passengerId,
            status: 'COMPLETED',
            paymentData: {
                amount: amount,
                paymentMethod: paymentMethod,
                webhookProcessed: paymentData.webhookProcessed || false,
                ...paymentData
            },
            completedAt: new Date().toISOString()
        });

        logger.info('Published payment.completed event', {
            paymentId,
            ticketId,
            paymentMethod,
            webhookProcessed: paymentData.webhookProcessed || false
        });
    } catch (error) {
        logger.error('Failed to publish payment.completed event', {
            error: error.message,
            paymentId,
            ticketId
        });
        throw error;
    }
}

/**
 * Publish payment.failed event
 */
async function publishPaymentFailed(paymentId, ticketId, errorMessage) {
    try {
        await publish('payment.failed', paymentId, {
            paymentId: paymentId,
            ticketId: ticketId,
            error: errorMessage,
            status: 'FAILED',
            createdAt: new Date().toISOString()
        });

        logger.info('Published payment.failed event', {
            paymentId,
            ticketId,
            error: errorMessage
        });
    } catch (error) {
        logger.error('Failed to publish payment.failed event', {
            error: error.message,
            paymentId,
            ticketId
        });
        throw error;
    }
}

/**
 * Publish payment.cancelled event
 */
async function publishPaymentCancelled(paymentId, ticketId, passengerId, status, reason) {
    try {
        await publish('payment.cancelled', paymentId, {
            paymentId: paymentId,
            ticketId: ticketId,
            passengerId: passengerId,
            status: status,
            reason: reason,
            cancelledAt: new Date().toISOString()
        });

        logger.info('Published payment.cancelled event', {
            paymentId,
            ticketId,
            reason
        });
    } catch (error) {
        logger.error('Failed to publish payment.cancelled event', {
            error: error.message,
            paymentId,
            ticketId
        });
        throw error;
    }
}

module.exports = {
    publishPaymentCompleted,
    publishPaymentFailed,
    publishPaymentCancelled
};
