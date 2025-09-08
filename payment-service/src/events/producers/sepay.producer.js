const { publish } = require('../../kafka/kafkaProducer');
const { logger } = require('../../config/logger');

/**
 * Publish ticket.payment_ready for SePay (QR image URL)
 */
async function publishTicketPaymentReadySepay(ticketId, paymentId, qrImageUrl) {
    try {
        await publish('ticket.payment_ready', ticketId, {
            ticketId: ticketId,
            paymentId: paymentId,
            paymentUrl: qrImageUrl,
            paymentMethod: 'sepay',
            paypalOrderId: null,
            status: 'PAYMENT_READY',
            createdAt: new Date().toISOString()
        });

        logger.info('Published ticket.payment_ready event for SePay', {
            ticketId,
            paymentId,
            hasPaymentUrl: !!qrImageUrl
        });
    } catch (error) {
        logger.error('Failed to publish ticket.payment_ready event (SePay)', {
            error: error.message,
            paymentId,
            ticketId
        });
        throw error;
    }
}

module.exports = {
    publishTicketPaymentReadySepay
};


