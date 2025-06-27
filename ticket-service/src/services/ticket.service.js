const { Ticket, Fare, Promotion } = require('../models/index.model');
const { Op } = require('sequelize');
const { logger } = require('../config/logger');

class TicketService {
    async createTicket(ticketData) {
        try {
            // Validate fare exists and is active
            const fare = await Fare.findByPk(ticketData.fareId);
            if (!fare || !fare.isCurrentlyValid()) {
                throw new Error('Invalid or inactive fare');
            }

            // Calculate pricing
            let originalPrice = fare.basePrice;
            let discountAmount = 0;
            let finalPrice = originalPrice;

            // Apply promotion if provided
            if (ticketData.promotionId) {
                const promotion = await Promotion.findByPk(ticketData.promotionId);
                if (promotion && promotion.isCurrentlyValid()) {
                    discountAmount = promotion.calculateDiscount(originalPrice);
                    finalPrice = originalPrice - discountAmount;
                    
                    // Increment promotion usage
                    await promotion.incrementUsage();
                } else {
                    logger.warn('Invalid promotion provided', { promotionId: ticketData.promotionId });
                    ticketData.promotionId = null;
                }
            }

            // Create ticket with calculated pricing
            const ticket = await Ticket.create({
                ...ticketData,
                originalPrice,
                discountAmount,
                finalPrice,
                status: 'active'
            });

            logger.info('Ticket created successfully', { ticketId: ticket.ticketId, passengerId: ticket.passengerId });
            return ticket;
        } catch (error) {
            logger.error('Error creating ticket', { error: error.message, ticketData });
            throw error;
        }
    }

    async getAllTickets(filters = {}) {
        try {
            const where = {};
            
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }
            
            if (filters.passengerId) {
                where.passengerId = filters.passengerId;
            }
            
            if (filters.tripId) {
                where.tripId = filters.tripId;
            }
            
            if (filters.status) {
                where.status = filters.status;
            }
            
            if (filters.ticketType) {
                where.ticketType = filters.ticketType;
            }
            
            if (filters.originStationId) {
                where.originStationId = filters.originStationId;
            }
            
            if (filters.destinationStationId) {
                where.destinationStationId = filters.destinationStationId;
            }

            if (filters.validFromStart && filters.validFromEnd) {
                where.validFrom = {
                    [Op.between]: [filters.validFromStart, filters.validFromEnd]
                };
            }

            const tickets = await Ticket.findAll({
                where,
                include: [
                    {
                        model: Fare,
                        as: 'fare',
                        attributes: ['fareId', 'basePrice', 'ticketType', 'passengerType', 'distance']
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        attributes: ['promotionId', 'code', 'name', 'type', 'value'],
                        required: false
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
            
            return tickets;
        } catch (error) {
            logger.error('Error fetching tickets', { error: error.message, filters });
            throw error;
        }
    }

    async getTicketById(ticketId) {
        try {
            const ticket = await Ticket.findByPk(ticketId, {
                include: [
                    {
                        model: Fare,
                        as: 'fare',
                        attributes: ['fareId', 'basePrice', 'ticketType', 'passengerType', 'distance', 'zones']
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        attributes: ['promotionId', 'code', 'name', 'type', 'value', 'description'],
                        required: false
                    }
                ]
            });
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            return ticket;
        } catch (error) {
            logger.error('Error fetching ticket by ID', { error: error.message, ticketId });
            throw error;
        }
    }

    async getTicketsByPassenger(passengerId, filters = {}) {
        try {
            const where = { passengerId };
            
            if (filters.status) {
                where.status = filters.status;
            }
            
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }

            const tickets = await Ticket.findAll({
                where,
                include: [
                    {
                        model: Fare,
                        as: 'fare',
                        attributes: ['fareId', 'basePrice', 'ticketType', 'passengerType']
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        attributes: ['promotionId', 'code', 'name', 'type'],
                        required: false
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
            
            return tickets;
        } catch (error) {
            logger.error('Error fetching tickets by passenger', { error: error.message, passengerId });
            throw error;
        }
    }

    async getActiveTicketsByPassenger(passengerId) {
        try {
            const tickets = await Ticket.findAll({
                where: {
                    passengerId,
                    status: 'active',
                    isActive: true,
                    validFrom: { [Op.lte]: new Date() },
                    validUntil: { [Op.gte]: new Date() }
                },
                include: [
                    {
                        model: Fare,
                        as: 'fare',
                        attributes: ['fareId', 'basePrice', 'ticketType', 'passengerType']
                    }
                ],
                order: [['validFrom', 'ASC']]
            });
            
            return tickets;
        } catch (error) {
            logger.error('Error fetching active tickets by passenger', { error: error.message, passengerId });
            throw error;
        }
    }

    async useTicket(ticketId, usageData = {}) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            if (!ticket.isValid()) {
                throw new Error('Ticket is not valid for use');
            }
            
            if (ticket.status !== 'active') {
                throw new Error('Ticket is not active');
            }

            const updateData = {
                status: 'used',
                usedAt: new Date()
            };

            const updatedTicket = await ticket.update(updateData);
            logger.info('Ticket used successfully', { ticketId, passengerId: ticket.passengerId });
            
            return updatedTicket;
        } catch (error) {
            logger.error('Error using ticket', { error: error.message, ticketId });
            throw error;
        }
    }

    async cancelTicket(ticketId, reason = 'Passenger cancellation') {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            if (ticket.status === 'used') {
                throw new Error('Cannot cancel a used ticket');
            }
            
            if (ticket.status === 'cancelled') {
                throw new Error('Ticket is already cancelled');
            }

            const updatedTicket = await ticket.update({
                status: 'cancelled',
                isActive: false
            });
            
            logger.info('Ticket cancelled successfully', { ticketId, passengerId: ticket.passengerId, reason });
            return updatedTicket;
        } catch (error) {
            logger.error('Error cancelling ticket', { error: error.message, ticketId });
            throw error;
        }
    }

    async refundTicket(ticketId, refundData = {}) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            if (ticket.status === 'used') {
                throw new Error('Cannot refund a used ticket');
            }
            
            if (ticket.status === 'refunded') {
                throw new Error('Ticket is already refunded');
            }

            const updatedTicket = await ticket.update({
                status: 'refunded',
                isActive: false
            });
            
            logger.info('Ticket refunded successfully', { ticketId, passengerId: ticket.passengerId, refundAmount: ticket.finalPrice });
            return updatedTicket;
        } catch (error) {
            logger.error('Error refunding ticket', { error: error.message, ticketId });
            throw error;
        }
    }

    async expireTickets() {
        try {
            const expiredTickets = await Ticket.update(
                { status: 'expired' },
                {
                    where: {
                        status: 'active',
                        validUntil: { [Op.lt]: new Date() },
                        isActive: true
                    },
                    returning: true
                }
            );
            
            logger.info('Expired tickets updated', { count: expiredTickets[0] });
            return expiredTickets[0];
        } catch (error) {
            logger.error('Error expiring tickets', { error: error.message });
            throw error;
        }
    }

    async getTicketStatistics(filters = {}) {
        try {
            const where = { isActive: true };
            
            if (filters.dateFrom && filters.dateTo) {
                where.createdAt = {
                    [Op.between]: [filters.dateFrom, filters.dateTo]
                };
            }
            
            if (filters.passengerId) {
                where.passengerId = filters.passengerId;
            }

            const stats = await Ticket.findAll({
                where,
                attributes: [
                    'status',
                    'ticketType',
                    [Ticket.sequelize.fn('COUNT', '*'), 'count'],
                    [Ticket.sequelize.fn('SUM', Ticket.sequelize.col('finalPrice')), 'totalRevenue'],
                    [Ticket.sequelize.fn('AVG', Ticket.sequelize.col('finalPrice')), 'averagePrice']
                ],
                group: ['status', 'ticketType'],
                raw: true
            });
            
            return stats;
        } catch (error) {
            logger.error('Error generating ticket statistics', { error: error.message, filters });
            throw error;
        }
    }

    async validateTicket(ticketId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                return { valid: false, reason: 'Ticket not found' };
            }
            
            if (!ticket.isValid()) {
                const now = new Date();
                if (ticket.validUntil < now) {
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
                    destinationStationId: ticket.destinationStationId
                }
            };
        } catch (error) {
            logger.error('Error validating ticket', { error: error.message, ticketId });
            throw error;
        }
    }
}

module.exports = new TicketService();
