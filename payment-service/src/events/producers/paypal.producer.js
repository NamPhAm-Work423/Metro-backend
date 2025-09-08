const { publish } = require('../../kafka/kafkaProducer');
const { logger } = require('../../config/logger');

/**
 * Publish ticket.payment_ready event for PayPal payments
 */
async function publishTicketPaymentReadyPaypal(ticketId, paymentId, passengerId, amount, paypalOrder, approvalLink, redirectUrls = {}) {
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
async function publishTicketPaymentReadyPaypalFallback(ticketId, paymentId, passengerId, amount, approvalLink) {
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

        logger.info('Published fallback ticket.payment_ready event (PayPal)', {
            ticketId,
            paymentId
        });
    } catch (error) {
        logger.error('Failed to publish fallback payment event (PayPal)', {
            error: error.message,
            paymentId,
            ticketId
        });
        throw error;
    }
}

module.exports = {
    publishTicketPaymentReadyPaypal,
    publishTicketPaymentReadyPaypalFallback
};


