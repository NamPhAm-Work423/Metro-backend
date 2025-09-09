const { Op } = require('sequelize');
const { logger } = require('../config/logger');
const { Ticket } = require('../models/index.model');
const { publishTicketExpiringSoon } = require('../events/ticket.producer');

async function publishExpiringSoonTickets(limit = 1000) {
    const now = new Date();
    const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const tickets = await Ticket.findAll({
        where: {
            status: 'active',
            validUntil: { [Op.lte]: inSevenDays, [Op.gt]: now }
        },
        limit
    });

    if (!tickets.length) {
        logger.info('No tickets expiring within 7 days');
        return 0;
    }

    let published = 0;
    for (const ticket of tickets) {
        try {
            await publishTicketExpiringSoon(ticket);
            published += 1;
        } catch (err) {
            logger.error('Failed to publish expiring soon for ticket', {
                ticketId: ticket.ticketId,
                error: err.message
            });
        }
    }

    return published;
}

module.exports = { publishExpiringSoonTickets };


