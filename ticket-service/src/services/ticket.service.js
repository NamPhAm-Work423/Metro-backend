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

            // Calculate pricing from Fare
            let basePrice = fare.basePrice;
            let discountAmount = 0;
            let totalPrice = basePrice;

            // Apply promotion if provided
            if (ticketData.promotionId) {
                const promotion = await Promotion.findByPk(ticketData.promotionId);
                if (promotion && promotion.isCurrentlyValid()) {
                    discountAmount = promotion.calculateDiscount(basePrice);
                    totalPrice = basePrice - discountAmount;
                    
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
                basePrice,
                discountAmount,
                totalPrice,
                status: 'active'
            });

            logger.info('Ticket created successfully', { ticketId: ticket.ticketId, passengerId: ticket.passengerId, totalPrice });
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

    async getInactiveTicketsByPassenger(passengerId) {
        try {
            const tickets = await Ticket.findAll({
                where: {
                    passengerId,
                    status: 'used'
                },
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
                order: [['usedAt', 'DESC']]
            });
            
            return tickets;
        } catch (error) {
            logger.error('Error fetching inactive tickets by passenger', { error: error.message, passengerId });
            throw error;
        }
    }

    async getCancelledTicketsByPassenger(passengerId) {
        try {
            const tickets = await Ticket.findAll({
                where: {
                    passengerId,
                    status: 'cancelled'
                },
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
                order: [['updatedAt', 'DESC']]
            });
            
            return tickets;
        } catch (error) {
            logger.error('Error fetching cancelled tickets by passenger', { error: error.message, passengerId });
            throw error;
        }
    }

    async getExpiredTicketsByPassenger(passengerId) {
        try {
            const tickets = await Ticket.findAll({
                where: {
                    passengerId,
                    [Op.or]: [
                        { status: 'expired' },
                        {
                            status: 'active',
                            validUntil: { [Op.lt]: new Date() }
                        }
                    ]
                },
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
                order: [['validUntil', 'DESC']]
            });
            
            return tickets;
        } catch (error) {
            logger.error('Error fetching expired tickets by passenger', { error: error.message, passengerId });
            throw error;
        }
    }

    async getTicketWithQR(ticketId, passengerId) {
        try {
            const ticket = await Ticket.findByPk(ticketId, {
                include: [
                    {
                        model: Fare,
                        as: 'fare'
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        required: false
                    }
                ]
            });
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            if (ticket.passengerId !== passengerId) {
                throw new Error('Unauthorized: Ticket does not belong to this passenger');
            }
            
            const qrData = {
                ticketId: ticket.ticketId,
                passengerId: ticket.passengerId,
                validFrom: ticket.validFrom,
                validUntil: ticket.validUntil,
                status: ticket.status,
                totalPrice: ticket.totalPrice,
                generatedAt: new Date().toISOString()
            };
            
            // Generate QR code (in real implementation, you would use a QR code library)
            const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');
            
            logger.info('Ticket with QR code retrieved', { ticketId, passengerId });
            
            return {
                ticket,
                qrCode: {
                    data: qrCodeData,
                    format: 'base64',
                    metadata: qrData
                }
            };
        } catch (error) {
            logger.error('Error getting ticket with QR', { error: error.message, ticketId });
            throw error;
        }
    }

    async sendTicketToPhone(ticketId, phoneNumber, passengerId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            if (ticket.passengerId !== passengerId) {
                throw new Error('Unauthorized: Ticket does not belong to this passenger');
            }
            
            // Generate ticket data for SMS
            const ticketSummary = {
                ticketId: ticket.ticketId,
                originStation: ticket.originStationId,
                destinationStation: ticket.destinationStationId,
                validFrom: ticket.validFrom,
                validUntil: ticket.validUntil,
                totalPrice: ticket.totalPrice,
                status: ticket.status
            };
            
            // In real implementation, you would send SMS here
            logger.info('Ticket sent to phone', { 
                ticketId, 
                phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'), 
                passengerId 
            });
            
            return {
                success: true,
                message: `Ticket sent to ${phoneNumber.replace(/\d(?=\d{4})/g, '*')}`,
                ticketSummary,
                sentAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error sending ticket to phone', { error: error.message, ticketId });
            throw error;
        }
    }

    async sendTicketToEmail(ticketId, email, passengerId) {
        try {
            const ticket = await Ticket.findByPk(ticketId, {
                include: [
                    {
                        model: Fare,
                        as: 'fare'
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        required: false
                    }
                ]
            });
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            if (ticket.passengerId !== passengerId) {
                throw new Error('Unauthorized: Ticket does not belong to this passenger');
            }
            
            // Generate detailed ticket data for email
            const ticketDetails = {
                ticketId: ticket.ticketId,
                passengerId: ticket.passengerId,
                originStation: ticket.originStationId,
                destinationStation: ticket.destinationStationId,
                ticketType: ticket.ticketType,
                validFrom: ticket.validFrom,
                validUntil: ticket.validUntil,
                basePrice: ticket.basePrice,
                discountAmount: ticket.discountAmount,
                totalPrice: ticket.totalPrice,
                status: ticket.status,
                fare: ticket.fare,
                promotion: ticket.promotion
            };
            
            // In real implementation, you would send email here
            logger.info('Ticket sent to email', { 
                ticketId, 
                email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), 
                passengerId 
            });
            
            return {
                success: true,
                message: `Ticket sent to ${email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`,
                ticketDetails,
                sentAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error sending ticket to email', { error: error.message, ticketId });
            throw error;
        }
    }

    async cancelTicket(ticketId, reason = 'Passenger cancellation', passengerId = null) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            // If passengerId is provided, validate ownership
            if (passengerId && ticket.passengerId !== passengerId) {
                throw new Error('Unauthorized: Ticket does not belong to this passenger');
            }
            
            if (ticket.status === 'used') {
                throw new Error('Cannot cancel a used ticket');
            }
            
            if (ticket.status === 'cancelled') {
                throw new Error('Ticket is already cancelled');
            }

            const updatedTicket = await ticket.update({
                status: 'cancelled',
                isActive: false,
                cancelledAt: new Date(),
                cancellationReason: reason
            });
            
            logger.info('Ticket cancelled successfully', { ticketId, passengerId: ticket.passengerId, reason });
            return updatedTicket;
        } catch (error) {
            logger.error('Error cancelling ticket', { error: error.message, ticketId });
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
                    destinationStationId: ticket.destinationStationId,
                    totalPrice: ticket.totalPrice
                }
            };
        } catch (error) {
            logger.error('Error validating ticket', { error: error.message, ticketId });
            throw error;
        }
    }

    async getTicketDetail(ticketId) {
        try {
            const ticket = await Ticket.findByPk(ticketId, {
                include: [
                    {
                        model: Fare,
                        as: 'fare'
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        required: false
                    }
                ]
            });
            
            return ticket;
        } catch (error) {
            logger.error('Error fetching ticket detail', { error: error.message, ticketId });
            throw error;
        }
    }

    async updateTicket(ticketId, updateData) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            // Prevent updating critical fields
            const allowedFields = ['notes', 'specialRequests'];
            const filteredData = {};
            
            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key)) {
                    filteredData[key] = updateData[key];
                }
            });
            
            const updatedTicket = await ticket.update(filteredData);
            
            logger.info('Ticket updated successfully', { ticketId, updatedFields: Object.keys(filteredData) });
            
            return updatedTicket;
        } catch (error) {
            logger.error('Error updating ticket', { error: error.message, ticketId });
            throw error;
        }
    }

    async deleteTicket(ticketId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            if (ticket.status === 'used') {
                throw new Error('Cannot delete a used ticket');
            }
            
            await ticket.destroy();
            
            logger.info('Ticket deleted successfully', { ticketId });
            
            return true;
        } catch (error) {
            logger.error('Error deleting ticket', { error: error.message, ticketId });
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
                    [Ticket.sequelize.fn('SUM', Ticket.sequelize.col('totalPrice')), 'totalRevenue'],
                    [Ticket.sequelize.fn('AVG', Ticket.sequelize.col('totalPrice')), 'averagePrice'],
                    [Ticket.sequelize.fn('SUM', Ticket.sequelize.col('basePrice')), 'totalBaseRevenue'],
                    [Ticket.sequelize.fn('SUM', Ticket.sequelize.col('discountAmount')), 'totalDiscounts']
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
}

module.exports = new TicketService();
