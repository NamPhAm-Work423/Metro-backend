const { publish } = require('../../kafka/kafkaProducer');
const { logger } = require('../../config/logger');

/**
 * Publish ticket.payment_ready for VNPay (redirect URL)
 */
async function publishTicketPaymentReadyVnpay(ticketId, paymentId, paymentUrl) {
    try {
        await publish('ticket.payment_ready', ticketId, {
            ticketId: ticketId,
            paymentId: paymentId,
            paymentUrl: paymentUrl,
            paymentMethod: 'vnpay',
            paypalOrderId: null,
            status: 'PAYMENT_READY',
            createdAt: new Date().toISOString()
        });

        logger.info('Published ticket.payment_ready event for VNPay', {
            ticketId,
            paymentId,
            hasPaymentUrl: !!paymentUrl
        });
    } catch (error) {
        logger.error('Failed to publish ticket.payment_ready event (VNPay)', {
            error: error.message,
            paymentId,
            ticketId
        });
        throw error;
    }
}

module.exports = {
    publishTicketPaymentReadyVnpay
};


