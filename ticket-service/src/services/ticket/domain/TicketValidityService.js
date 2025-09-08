const { logger } = require('../../../config/logger');

class TicketValidityService {
    static calculateValidityPeriod(ticketType) {
        const now = new Date();
        const validFrom = now;
        const validUntil = new Date(now);

        switch ((ticketType || '').toLowerCase()) {
            case 'day_pass':
                validUntil.setDate(validUntil.getDate() + 1);
                break;
            case 'weekly_pass':
                validUntil.setDate(validUntil.getDate() + 7);
                break;
            case 'monthly_pass':
                validUntil.setDate(validUntil.getDate() + 30);
                break;
            case 'yearly_pass':
                validUntil.setDate(validUntil.getDate() + 365);
                break;
            case 'lifetime_pass':
                validUntil.setFullYear(validUntil.getFullYear() + 100);
                break;
            default:
                validUntil.setDate(validUntil.getDate() + 30);
        }

        logger.debug('Calculated validity period', { ticketType, validFrom, validUntil });
        return { validFrom, validUntil };
    }
}

module.exports = { TicketValidityService };


