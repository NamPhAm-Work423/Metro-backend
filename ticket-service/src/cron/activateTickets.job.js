const { Op } = require('sequelize');
const { logger } = require('../config/logger');
const { Ticket } = require('../models/index.model');
const { TicketValidityService } = require('../services/ticket/domain/TicketValidityService');
const { publishTicketActivated } = require('../events/ticket.producer');

async function activateDueTickets(limit = 500) {
    const now = new Date();
    const longTermTypes = ['day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass'];

    const tickets = await Ticket.findAll({
        where: {
            status: 'inactive',
            activatedAt: { [Op.lte]: now },
            ticketType: { [Op.in]: longTermTypes }
        },
        limit
    });

    if (!tickets.length) {
        logger.debug('No tickets due for activation');
        return 0;
    }

    let activatedCount = 0;
    for (const ticket of tickets) {
        try {
            const { validFrom, validUntil } = TicketValidityService.calculateValidityPeriod(ticket.ticketType);
            await ticket.update({
                status: 'active',
                validFrom,
                validUntil
            });
            try {
                await publishTicketActivated(ticket, {
                    paymentMethod: ticket.paymentMethod,
                    status: 'active',
                    gatewayResponse: null
                });
            } catch (pubErr) {
                logger.error('Failed to publish ticket activated from cron', {
                    ticketId: ticket.ticketId,
                    error: pubErr.message
                });
            }
            activatedCount += 1;
            logger.info('Ticket auto-activated by cron', {
                ticketId: ticket.ticketId,
                ticketType: ticket.ticketType,
                validFrom,
                validUntil
            });
        } catch (err) {
            logger.error('Failed to auto-activate ticket', {
                ticketId: ticket.ticketId,
                error: err.message
            });
        }
    }

    return activatedCount;
}

module.exports = { activateDueTickets };


