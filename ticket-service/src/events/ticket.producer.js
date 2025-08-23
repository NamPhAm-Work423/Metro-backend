const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');
const { Ticket } = require('../models/index.model');
const { paymentCache } = require('../cache/paymentCache');

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
 * @param {Object} options - Additional options
 * @param {string} options.paymentSuccessUrl - URL to redirect after successful payment
 * @param {string} options.paymentFailUrl - URL to redirect after failed payment
 */
async function publishTicketCreated(ticket, ticketType, options = {}) {
    try {
        // Use the payment ID that's already in the ticket
        const paymentId = ticket.paymentId;
        
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
                paymentMethod: ticket.paymentMethod,
                paymentSuccessUrl: options.paymentSuccessUrl,
                paymentFailUrl: options.paymentFailUrl,
                currency: options.currency || 'VND'
            },
            status: 'pending_payment',
            createdAt: new Date().toISOString()
        };

        // Log URLs for debugging
        logger.info('Publishing ticket created event with URLs', {
            ticketId: ticket.ticketId,
            paymentId: paymentId,
            hasPaymentSuccessUrl: !!options.paymentSuccessUrl,
            hasPaymentFailUrl: !!options.paymentFailUrl,
            paymentSuccessUrl: options.paymentSuccessUrl,
            paymentFailUrl: options.paymentFailUrl
        });

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
 * Handle payment ready event from payment service
 * @param {Object} event - Payment ready event data
 */
async function handlePaymentReady(event) {
    try {
        const { 
            ticketId, 
            paymentId, 
            paymentUrl, 
            paymentMethod, 
            paypalOrderId = null, // Provide default value
            status 
        } = event;

        logger.info('Processing payment ready event', {
            ticketId,
            paymentId,
            paymentMethod,
            hasPaymentUrl: !!paymentUrl,
            paymentUrl: paymentUrl
        });

        // Update ticket with payment information
        const ticket = await Ticket.findByPk(ticketId);
        if (!ticket) {
            logger.error('Ticket not found for payment ready event', { ticketId });
            return;
        }

        logger.info('Found ticket for payment ready event', {
            ticketId: ticket.ticketId,
            currentStatus: ticket.status,
            currentPaymentUrl: ticket.paymentUrl,
            currentPaypalOrderId: ticket.paypalOrderId
        });

        // Update ticket status to indicate payment is ready
        const updateData = {
            status: 'pending_payment',
            updatedAt: new Date()
        };

        // Store payment data in cache for immediate access
        paymentCache.set(paymentId, {
            ticketId,
            paymentId,
            paymentUrl,
            paymentMethod,
            paypalOrderId,
            status
        });

        // Also store by ticket ID for fallback
        paymentCache.set(ticketId, {
            ticketId,
            paymentId,
            paymentUrl,
            paymentMethod,
            paypalOrderId,
            status
        });

        logger.info('Payment data stored in cache', {
            ticketId,
            paymentId,
            paymentUrl: paymentUrl,
            paypalOrderId: paypalOrderId
        });

        logger.info('Updating ticket with payment ready status', {
            ticketId,
            paymentId,
            paymentMethod,
            updateData,
            originalStatus: ticket.status,
            paymentUrl: paymentUrl,
            paypalOrderId: paypalOrderId
        });

        try {
            await ticket.update(updateData);
            logger.info('Ticket update completed successfully', { 
                ticketId, 
                paymentId,
                paymentUrl: paymentUrl,
                paypalOrderId: paypalOrderId
            });
        } catch (updateError) {
            logger.error('Failed to update ticket with payment information', {
                ticketId,
                paymentId,
                error: updateError.message,
                updateData
            });
            throw updateError;
        }

        // Reload the ticket to confirm the update
        await ticket.reload();

        logger.info('Ticket reloaded after update', {
            ticketId: ticket.ticketId,
            updatedStatus: ticket.status
        });

        // Verify the ticket can be found by payment ID
        const verifyTicket = await Ticket.findOne({
            where: { paymentId: paymentId }
        });

        // Also check if ticket can be found by ticket ID
        const verifyTicketById = await Ticket.findByPk(ticketId);

        logger.info('Ticket updated with payment ready status', {
            ticketId,
            paymentId,
            paymentMethod,
            updatedStatus: ticket.status,
            ticketFoundByPaymentId: !!verifyTicket,
            verifyTicketId: verifyTicket?.ticketId,
            ticketFoundById: !!verifyTicketById,
            verifyTicketByIdStatus: verifyTicketById?.status,
            storedPaymentUrl: ticket.paymentUrl,
            storedPaypalOrderId: ticket.paypalOrderId
        });

    } catch (error) {
        logger.error('Error processing payment ready event', {
            error: error.message,
            ticketId: event.ticketId
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
            qrCode: ticket.qrCode,
            totalPrice: ticket.totalPrice,
            totalPassengers: ticket.totalPassengers,
            paymentMethod: paymentData.paymentMethod,
            paymentStatus: paymentData.status,
            gatewayResponse: paymentData.gatewayResponse,
            activatedAt: new Date().toISOString(),
            status: 'active',
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
            status: 'active'
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
            status: 'cancelled',
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
            status: 'expired',
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
            status: 'used',
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

/**
 * Get payment data from cache
 * @param {string} key - Payment ID or ticket ID
 * @returns {Object|null} Payment data or null if not found
 */
function getPaymentData(key) {
    // Use shared cache's get method which handles expiry automatically
    return paymentCache.get(key);
}

module.exports = {
    generatePaymentId,
    publishTicketCreated,
    handlePaymentReady,
    publishTicketActivated,
    publishTicketCancelled,
    publishTicketExpired,
    publishTicketUsed,
    getPaymentData
};
