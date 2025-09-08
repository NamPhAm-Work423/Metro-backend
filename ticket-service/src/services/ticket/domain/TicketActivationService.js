const { logger } = require('../../../config/logger');
const { publishTicketActivated } = require('../../../events/ticket.producer');
const { TicketValidityService } = require('./TicketValidityService');

class TicketActivationService {
    static async activateLongTermTicket(ticket) {
        if (!ticket) throw new Error('Ticket not found');

        const longTermTypes = ['day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass'];
        if (!longTermTypes.includes((ticket.ticketType || '').toLowerCase())) {
            throw new Error('Only long-term tickets can be activated');
        }

        if (ticket.status === 'active') {
            throw new Error('Ticket is already active');
        }

        if (!['payment_confirmed', 'inactive'].includes(ticket.status)) {
            throw new Error('Ticket must be paid before activation');
        }

        const { validFrom, validUntil } = TicketValidityService.calculateValidityPeriod(ticket.ticketType);
        const activatedAt = new Date();

        const updatedTicket = await ticket.update({
            status: 'active',
            validFrom,
            validUntil,
            activatedAt
        });

        logger.info('Long-term ticket activated successfully', {
            ticketId: ticket.ticketId,
            ticketType: ticket.ticketType,
            validFrom,
            validUntil,
            activatedAt,
            passengerId: ticket.passengerId
        });

        try {
            const paymentData = {
                paymentMethod: ticket.paymentMethod,
                status: ticket.status,
                gatewayResponse: null
            };
            await publishTicketActivated(updatedTicket, paymentData);
            logger.info('Ticket activated event published for long-term ticket', {
                ticketId: ticket.ticketId,
                ticketType: ticket.ticketType,
                activatedAt
            });
        } catch (publishError) {
            logger.error('Failed to publish ticket activated event for long-term ticket', {
                ticketId: ticket.ticketId,
                error: publishError.message
            });
        }

        return updatedTicket;
    }
}

module.exports = { TicketActivationService };


