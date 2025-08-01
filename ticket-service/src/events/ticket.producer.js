const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

/**
 * Generate payment ID for ticket
 * @param {number} ticketId - Ticket ID
 * @param {string} ticketType - Type of ticket (short-term, long-term)
 * @returns {string} Payment ID
 */
function generatePaymentId(ticketId, ticketType) {
    const timestamp = Date.now();
    const typePrefix = ticketType === 'long-term' ? 'LNG' : 'SHT';
    return `TKT_${typePrefix}_${ticketId}_PAY_${timestamp}`;
}

/**
 * Publish ticket created event
 * @param {Object} ticket - Ticket object
 * @param {string} ticketType - Type of ticket (short-term, long-term)
 */
async function publishTicketCreated(ticket, ticketType) {
    try {
        const paymentId = generatePaymentId(ticket.ticketId, ticketType);
        
        const eventData = {
            ticketId: ticket.ticketId,
            paymentId: paymentId,
            passengerId: ticket.passengerId,
            amount: ticket.totalPrice,
            ticketType: ticketType,
            ticketData: {
                originStationId: ticket.originStationId,
                destinationStationId: ticket.destinationStationId,
                validFrom: ticket.validFrom,
                validUntil: ticket.validUntil,
                fareBreakdown: ticket.fareBreakdown,
                paymentMethod: ticket.paymentMethod
            },
            status: 'PENDING_PAYMENT',
            createdAt: new Date().toISOString()
        };

        await publish('ticket.created', ticket.ticketId, eventData);
        
        logger.info('Ticket created event published', {
            ticketId: ticket.ticketId,
            paymentId: paymentId,
            ticketType: ticketType,
            amount: ticket.totalPrice
        });

        return paymentId;
    } catch (error) {
        logger.error('Failed to publish ticket created event', {
            ticketId: ticket.ticketId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Publish ticket activated event (after payment completion)
 * @param {Object} ticket - Ticket object
 * @param {Object} paymentData - Payment data
 */
async function publishTicketActivated(ticket, paymentData) {
    try {
        const eventData = {
            ticketId: ticket.ticketId,
            paymentId: ticket.paymentId,
            passengerId: ticket.passengerId,
            status: 'ACTIVE',
            paymentData: {
                paymentMethod: paymentData.paymentMethod,
                paymentStatus: paymentData.status,
                gatewayResponse: paymentData.gatewayResponse
            },
            activatedAt: new Date().toISOString()
        };

        await publish('ticket.activated', ticket.ticketId, eventData);
        
        logger.info('Ticket activated event published', {
            ticketId: ticket.ticketId,
            paymentId: ticket.paymentId,
            status: 'ACTIVE'
        });
    } catch (error) {
        logger.error('Failed to publish ticket activated event', {
            ticketId: ticket.ticketId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Publish ticket cancelled event
 * @param {Object} ticket - Ticket object
 * @param {string} reason - Cancellation reason
 */
async function publishTicketCancelled(ticket, reason) {
    try {
        const eventData = {
            ticketId: ticket.ticketId,
            paymentId: ticket.paymentId,
            passengerId: ticket.passengerId,
            status: 'CANCELLED',
            reason: reason,
            cancelledAt: new Date().toISOString()
        };

        await publish('ticket.cancelled', ticket.ticketId, eventData);
        
        logger.info('Ticket cancelled event published', {
            ticketId: ticket.ticketId,
            paymentId: ticket.paymentId,
            reason: reason
        });
    } catch (error) {
        logger.error('Failed to publish ticket cancelled event', {
            ticketId: ticket.ticketId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Publish ticket expired event
 * @param {Object} ticket - Ticket object
 */
async function publishTicketExpired(ticket) {
    try {
        const eventData = {
            ticketId: ticket.ticketId,
            paymentId: ticket.paymentId,
            passengerId: ticket.passengerId,
            status: 'EXPIRED',
            expiredAt: new Date().toISOString()
        };

        await publish('ticket.expired', ticket.ticketId, eventData);
        
        logger.info('Ticket expired event published', {
            ticketId: ticket.ticketId,
            paymentId: ticket.paymentId
        });
    } catch (error) {
        logger.error('Failed to publish ticket expired event', {
            ticketId: ticket.ticketId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Publish ticket used event (when ticket is scanned/used)
 * @param {Object} ticket - Ticket object
 * @param {Object} usageData - Usage data
 */
async function publishTicketUsed(ticket, usageData) {
    try {
        const eventData = {
            ticketId: ticket.ticketId,
            paymentId: ticket.paymentId,
            passengerId: ticket.passengerId,
            status: 'USED',
            usageData: {
                stationId: usageData.stationId,
                usedAt: usageData.usedAt,
                direction: usageData.direction // 'entry' or 'exit'
            },
            usedAt: new Date().toISOString()
        };

        await publish('ticket.used', ticket.ticketId, eventData);
        
        logger.info('Ticket used event published', {
            ticketId: ticket.ticketId,
            paymentId: ticket.paymentId,
            stationId: usageData.stationId
        });
    } catch (error) {
        logger.error('Failed to publish ticket used event', {
            ticketId: ticket.ticketId,
            error: error.message
        });
        throw error;
    }
}

module.exports = {
    generatePaymentId,
    publishTicketCreated,
    publishTicketActivated,
    publishTicketCancelled,
    publishTicketExpired,
    publishTicketUsed
};
