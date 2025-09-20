const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');
const { Ticket } = require('../models/index.model');
const { paymentCache } = require('../cache/paymentCache');
const TicketDataEnrichmentService = require('../services/ticket/helpers/TicketDataEnrichmentService');

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
            qrCode: ticket.qrCode,
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
            hasQrCode: !!ticket.qrCode,
            qrCodeLength: ticket.qrCode?.length || 0,
            hasPaymentSuccessUrl: !!options.paymentSuccessUrl,
            hasPaymentFailUrl: !!options.paymentFailUrl,
            paymentSuccessUrl: options.paymentSuccessUrl,
            paymentFailUrl: options.paymentFailUrl
        });

        logger.info('ticket.created event payload', eventData);
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
const ticketController = require('../controllers/ticket.controller');
async function handlePaymentReady(event) {
    try {
        await ticketController.processPaymentReadyEvent(event);
    } catch (error) {
        logger.error('Error processing payment ready event', { error: error.message, ticketId: event.ticketId });
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
        // Calculate totalPassengers from fareBreakdown if not available
        let totalPassengers = ticket.totalPassengers;
        if (!totalPassengers && ticket.fareBreakdown?.totalPassengers) {
            totalPassengers = ticket.fareBreakdown.totalPassengers;
        } else if (!totalPassengers && ticket.fareBreakdown?.passengerBreakdown) {
            // Calculate from passengerBreakdown if available
            const breakdown = ticket.fareBreakdown.passengerBreakdown;
            if (Array.isArray(breakdown)) {
                totalPassengers = breakdown.reduce((total, item) => total + (item.count || 0), 0);
            } else if (typeof breakdown === 'object') {
                totalPassengers = Object.values(breakdown).reduce((total, count) => total + (typeof count === 'number' ? count : 0), 0);
            }
        }
        totalPassengers = totalPassengers || 1;

        ticket.totalPassengers = totalPassengers;

        // Enrich ticket data with human-readable information
        const enrichedTicketData = await TicketDataEnrichmentService.enrichTicketForEvent(ticket);
        
        const eventData = {
            ticketId: ticket.ticketId,
            paymentId: ticket.paymentId,
            passengerId: ticket.passengerId,
            qrCode: ticket.qrCode,
            totalPrice: ticket.totalPrice,
            totalPassengers: totalPassengers,
            originStationId: ticket.originStationId,
            destinationStationId: ticket.destinationStationId,
            ticketType: ticket.ticketType, 
            paymentMethod: paymentData.paymentMethod,
            paymentStatus: paymentData.status,
            gatewayResponse: paymentData.gatewayResponse,
            activatedAt: ticket.activatedAt,
            validFrom: ticket.validFrom,
            validUntil: ticket.validUntil,
            status: 'active',
            templateName: enrichedTicketData.templateName,
            isMultiUse: enrichedTicketData.isMultiUse,
            paymentData: {
                paymentMethod: paymentData.paymentMethod,
                paymentStatus: paymentData.status,
                gatewayResponse: paymentData.gatewayResponse
            },
            
            displayData: enrichedTicketData.displayData
        };

        logger.info('Publishing ticket activated event with enriched data', {
            ticketId: ticket.ticketId,
            paymentId: ticket.paymentId,
            passengerId: ticket.passengerId,
            totalPrice: ticket.totalPrice,
            totalPassengers: totalPassengers,
            ticketType: ticket.ticketType,
            originStationId: ticket.originStationId,
            destinationStationId: ticket.destinationStationId,
            qrCodeLength: ticket.qrCode?.length || 0,
            hasQrCode: !!ticket.qrCode,
            qrCodeValue: ticket.qrCode ? String(ticket.qrCode).substring(0, 50) + '...' : 'null',
            qrCodeType: typeof ticket.qrCode,
            paymentMethod: paymentData.paymentMethod,
            paymentStatus: paymentData.status,
            enrichedDisplayData: {
                fromStation: enrichedTicketData.displayData?.fromStationName,
                toStation: enrichedTicketData.displayData?.toStationName,
                ticketTypeName: enrichedTicketData.displayData?.ticketTypeName,
                formattedPrice: enrichedTicketData.displayData?.formattedPrice
            }
        });

        logger.info('ticket.activated event payload', eventData);
        await publish('ticket.activated', ticket.ticketId, eventData);
        
        logger.info('Ticket activated event published successfully', {
            ticketId: ticket.ticketId,
            paymentId: ticket.paymentId,
            passengerId: ticket.passengerId,
            totalPassengers: totalPassengers,
            ticketType: ticket.ticketType,
            status: 'active'
        });
    } catch (error) {
        logger.error('Failed to publish ticket activated event', {
            ticketId: ticket.ticketId,
            error: error.message,
            stack: error.stack
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
 * Publish ticket expiring soon event (7 days or less)
 * @param {Object} ticket - Ticket object
 */
async function publishTicketExpiringSoon(ticket) {
    try {
        const daysLeft = Math.ceil((new Date(ticket.validUntil) - new Date()) / (24 * 60 * 60 * 1000));

        const eventData = {
            ticketId: ticket.ticketId,
            paymentId: ticket.paymentId,
            passengerId: ticket.passengerId,
            status: ticket.status,
            validUntil: ticket.validUntil,
            daysLeft
        };

        await publish('ticket.expiring_soon', ticket.ticketId, eventData);
        
        logger.info('Ticket expiring soon event published', {
            ticketId: ticket.ticketId,
            daysLeft
        });
    } catch (error) {
        logger.error('Failed to publish ticket expiring soon event', {
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
                usedList: usageData.usedList,
                direction: usageData.direction // 'entry' or 'exit'
            },
            usedList: new Date().toISOString()
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
    publishTicketExpiringSoon,
    publishTicketUsed,
    getPaymentData
};
