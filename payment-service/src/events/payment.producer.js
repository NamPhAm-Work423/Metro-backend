const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

/**
 * Publish ticket.payment_ready event for PayPal payments
 */
async function publishTicketPaymentReady(ticketId, paymentId, passengerId, amount, paypalOrder, approvalLink, redirectUrls = {}) {
    try {
        await publish('ticket.payment_ready', ticketId, {
            ticketId: ticketId,
            paymentId: paymentId,
            passengerId: passengerId,
            amount: amount,
            paymentMethod: 'paypal',
            paypalOrderId: paypalOrder.id,
            paypalOrder: paypalOrder,
            paymentUrl: approvalLink || null,
            redirectUrls: redirectUrls,
            status: 'PAYMENT_READY',
            createdAt: new Date().toISOString()
        });

        logger.info('Published ticket.payment_ready event for PayPal', {
            ticketId,
            paymentId,
            paypalOrderId: paypalOrder.id
        });
    } catch (error) {
        logger.error('Failed to publish ticket.payment_ready event for PayPal', {
            error: error.message,
            paymentId,
            ticketId
        });
        throw error;
    }
}

/**
 * Publish ticket.payment_ready event for fallback PayPal payments
 */
async function publishTicketPaymentReadyFallback(ticketId, paymentId, passengerId, amount, approvalLink) {
    try {
        await publish('ticket.payment_ready', ticketId, {
            ticketId: ticketId,
            paymentId: paymentId,
            passengerId: passengerId,
            amount: amount,
            paymentMethod: 'paypal',
            paypalOrderId: null,
            paymentUrl: approvalLink,
            status: 'PAYMENT_READY',
            fallbackMode: true,
            error: 'PayPal authentication failed',
            createdAt: new Date().toISOString()
        });

        logger.info('Published fallback ticket.payment_ready event', {
            ticketId,
            paymentId
        });
    } catch (error) {
        logger.error('Failed to publish fallback payment event', {
            error: error.message,
            paymentId,
            ticketId
        });
        throw error;
    }
}

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
 * Publish ticket.payment_ready event for non-PayPal payments
 */
async function publishTicketPaymentReadyNonPaypal(ticketId, paymentId, paymentMethod) {
    try {
        await publish('ticket.payment_ready', ticketId, {
            ticketId: ticketId,
            paymentId: paymentId,
            paymentUrl: null, // No payment URL for non-PayPal methods
            paymentMethod: paymentMethod,
            paypalOrderId: null,
            status: 'PAYMENT_READY',
            testMode: true,
            createdAt: new Date().toISOString()
        });

        logger.info('Published ticket.payment_ready event for non-PayPal', {
            ticketId,
            paymentId,
            paymentMethod
        });
    } catch (error) {
        logger.error('Failed to publish ticket.payment_ready event', {
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

// Note: publishPaymentCompletedForActivation function removed
// Payment completion should only be triggered by webhooks via paypal.hook.consumer.js

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
    publishTicketPaymentReady,
    publishTicketPaymentReadyFallback,
    publishPaymentCompleted,
    publishTicketPaymentReadyNonPaypal,
    publishPaymentFailed,
    publishPaymentCancelled
};
