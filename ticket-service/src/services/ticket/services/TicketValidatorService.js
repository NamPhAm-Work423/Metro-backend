const { Ticket } = require('../../../models/index.model');
const { logger } = require('../../../config/logger');
const ITicketValidator = require('../interfaces/ITicketValidator');

class TicketValidatorService extends ITicketValidator {
    constructor() {
        super();
    }

    /**
     * Validate ticket by ID
     * @param {string} ticketId - Ticket ID
     * @returns {Promise<Object>} Validation result
     */
    async validateTicket(ticketId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                return { valid: false, reason: 'Ticket not found' };
            }
            
            if (!this.isValid(ticket)) {
                const now = new Date();
                if (this.isExpired(ticket)) {
                    return { valid: false, reason: 'Ticket has expired' };
                }
                if (ticket.validFrom > now) {
                    return { valid: false, reason: 'Ticket is not yet valid' };
                }
                if (ticket.status !== 'active') {
                    return { valid: false, reason: `Ticket status is ${ticket.status}` };
                }
                if (!ticket.isActive) {
                    return { valid: false, reason: 'Ticket is deactivated' };
                }
            }
            
            return { 
                valid: true, 
                ticket: {
                    ticketId: ticket.ticketId,
                    passengerId: ticket.passengerId,
                    ticketType: ticket.ticketType,
                    validFrom: ticket.validFrom,
                    validUntil: ticket.validUntil,
                    originStationId: ticket.originStationId,
                    destinationStationId: ticket.destinationStationId,
                    totalPrice: ticket.totalPrice
                }
            };
        } catch (error) {
            logger.error('Error validating ticket', { error: error.message, ticketId });
            throw error;
        }
    }

    /**
     * Validate ticket at gate
     * @param {string} ticketId - Ticket ID
     * @param {string} stationId - Station ID
     * @param {string} action - 'entry' or 'exit'
     * @returns {Promise<Object>} Validation result
     */
    async validateTicketAtGate(ticketId, stationId, action = 'entry') {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            if (!ticket) {
                throw new Error('Ticket not found');
            }

            // Check ticket validity
            if (!this.isValid(ticket)) {
                return {
                    valid: false,
                    reason: this.isExpired(ticket) ? 'Ticket has expired' : 'Ticket is not valid'
                };
            }

            // For unlimited passes
            if (ticket.ticketType.includes('pass')) {
                return { valid: true };
            }

            // For entry
            if (action === 'entry') {
                return this.validateEntry(ticketId, stationId);
            }

            // For exit
            return this.validateExit(ticketId, stationId);

        } catch (error) {
            logger.error('Error validating ticket at gate', {
                error: error.message,
                ticketId,
                stationId,
                action
            });
            throw error;
        }
    }

    /**
     * Validate ticket for entry
     * @param {string} ticketId - Ticket ID
     * @param {string} stationId - Station ID
     * @returns {Promise<Object>} Validation result
     */
    async validateEntry(ticketId, stationId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (ticket.originStationId !== stationId) {
                return {
                    valid: false,
                    reason: 'Invalid entry station'
                };
            }
            
            return { valid: true };
        } catch (error) {
            logger.error('Error validating entry', { error: error.message, ticketId, stationId });
            throw error;
        }
    }

    /**
     * Validate ticket for exit
     * @param {string} ticketId - Ticket ID
     * @param {string} stationId - Station ID
     * @returns {Promise<Object>} Validation result
     */
    async validateExit(ticketId, stationId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            // For now, allow exit at any station
            // In a real implementation, you might want to validate against allowed exit stations
            return { valid: true };
        } catch (error) {
            logger.error('Error validating exit', { error: error.message, ticketId, stationId });
            throw error;
        }
    }

    /**
     * Check if ticket is expired
     * @param {Object} ticket - Ticket object
     * @returns {boolean} True if expired
     */
    isExpired(ticket) {
        const now = new Date();
        return ticket.validUntil < now;
    }

    /**
     * Check if ticket is valid for use
     * @param {Object} ticket - Ticket object
     * @returns {boolean} True if valid
     */
    isValid(ticket) {
        const now = new Date();
        return ticket.status === 'active' && 
               ticket.isActive && 
               ticket.validFrom <= now && 
               ticket.validUntil >= now;
    }

    /**
     * Validate ticket ownership
     * @param {string} ticketId - Ticket ID
     * @param {string} passengerId - Passenger ID
     * @returns {Promise<boolean>} True if owned by passenger
     */
    async validateOwnership(ticketId, passengerId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            if (!ticket) {
                return false;
            }
            
            return ticket.passengerId === passengerId;
        } catch (error) {
            logger.error('Error validating ownership', { error: error.message, ticketId, passengerId });
            return false;
        }
    }
}

module.exports = new TicketValidatorService();
