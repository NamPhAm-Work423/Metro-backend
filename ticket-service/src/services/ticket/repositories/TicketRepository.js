const { Ticket, Fare, Promotion } = require('../../../models/index.model');
const { Op } = require('sequelize');
const { logger } = require('../../../config/logger');
const ITicketRepository = require('../interfaces/ITicketRepository');

class TicketRepository extends ITicketRepository {
    /**
     * Create a new ticket
     * @param {Object} ticketData - Ticket data to create
     * @returns {Promise<Object>} Created ticket
     */
    async create(ticketData) {
        try {
            const ticket = await Ticket.create(ticketData);
            logger.info('Ticket created successfully', { ticketId: ticket.ticketId });
            return ticket;
        } catch (error) {
            logger.error('Error creating ticket', { error: error.message, ticketData });
            throw error;
        }
    }

    /**
     * Find ticket by ID
     * @param {string} ticketId - Ticket ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Ticket object
     */
    async findById(ticketId, options = {}) {
        try {
            const include = options.include || [
                {
                    model: Fare,
                    as: 'fare',
                    attributes: ['fareId', 'basePrice', 'routeId', 'currency', 'isActive']
                },
                {
                    model: Promotion,
                    as: 'promotion',
                    attributes: ['promotionId', 'promotionCode', 'name', 'type', 'value', 'description'],
                    required: false
                }
            ];

            const ticket = await Ticket.findByPk(ticketId, { include });
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }

            return ticket;
        } catch (error) {
            logger.error('Error finding ticket by ID', { error: error.message, ticketId });
            throw error;
        }
    }

    /**
     * Find all tickets with filters
     * @param {Object} filters - Filter criteria
     * @param {Object} options - Query options
     * @returns {Promise<Array>} List of tickets
     */
    async findAll(filters = {}, options = {}) {
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

            if (filters.notes) {
                where.notes = {
                    [Op.like]: `%${filters.notes}%`
                };
            }

            if (filters.specialRequests) {
                where.specialRequests = {
                    [Op.like]: `%${filters.specialRequests}%`
                };
            }

            const include = options.include || [
                {
                    model: Fare,
                    as: 'fare',
                    attributes: ['fareId', 'routeId', 'basePrice', 'currency', 'isActive'],
                    required: false
                },
                {
                    model: Promotion,
                    as: 'promotion',
                    attributes: ['promotionId', 'promotionCode', 'name', 'type', 'value'],
                    required: false
                }
            ];

            const tickets = await Ticket.findAll({
                where,
                include,
                order: [['createdAt', 'DESC']],
                subQuery: false,
                distinct: true
            });
            
            return tickets;
        } catch (error) {
            logger.error('Error finding tickets', { error: error.message, filters });
            throw error;
        }
    }

    /**
     * Find tickets by passenger ID
     * @param {string} passengerId - Passenger ID
     * @param {Object} filters - Filter criteria
     * @param {Object} options - Query options
     * @returns {Promise<Array>} List of tickets
     */
    async findByPassengerId(passengerId, filters = {}, options = {}) {
        try {
            const where = { passengerId };
            
            if (filters.status) {
                where.status = filters.status;
            }
            
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }

            const include = options.include || [
                {
                    model: Fare,
                    as: 'fare',
                    attributes: ['fareId', 'routeId', 'basePrice', 'currency', 'isActive']
                },
                {
                    model: Promotion,
                    as: 'promotion',
                    attributes: ['promotionId', 'promotionCode', 'name', 'type'],
                    required: false
                }
            ];

            const tickets = await Ticket.findAll({
                where,
                include,
                order: [['createdAt', 'DESC']]
            });
            
            return tickets;
        } catch (error) {
            logger.error('Error finding tickets by passenger', { error: error.message, passengerId });
            throw error;
        }
    }

    /**
     * Update ticket
     * @param {string} ticketId - Ticket ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated ticket
     */
    async update(ticketId, updateData) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            const updatedTicket = await ticket.update(updateData);
            
            logger.info('Ticket updated successfully', { ticketId, updatedFields: Object.keys(updateData) });
            
            return updatedTicket;
        } catch (error) {
            logger.error('Error updating ticket', { error: error.message, ticketId });
            throw error;
        }
    }

    /**
     * Delete ticket (soft delete)
     * @param {string} ticketId - Ticket ID
     * @returns {Promise<boolean>} Deletion result
     */
    async delete(ticketId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                logger.error('Ticket not found', { ticketId });
                return false;
            }
            
            if (ticket.status === 'used') {
                logger.error('Cannot delete a used ticket', { ticketId });
                return false;
            }   
            
            await ticket.destroy();
            
            logger.info('Ticket deleted successfully', { ticketId });
            
            return true;
        } catch (error) {
            logger.error('Error deleting ticket', { error: error.message, ticketId });
            throw error;
        }
    }

    /**
     * Bulk update tickets
     * @param {Object} filters - Filter criteria
     * @param {Object} updateData - Data to update
     * @returns {Promise<number>} Number of updated tickets
     */
    async bulkUpdate(filters, updateData) {
        try {
            const result = await Ticket.update(updateData, { where: filters });
            const updatedCount = result[0];
            
            logger.info('Bulk update completed', { updatedCount, filters });
            
            return updatedCount;
        } catch (error) {
            logger.error('Error bulk updating tickets', { error: error.message, filters });
            throw error;
        }
    }

    /**
     * Count tickets with filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<number>} Count of tickets
     */
    async count(filters = {}) {
        try {
            const count = await Ticket.count({ where: filters });
            return count;
        } catch (error) {
            logger.error('Error counting tickets', { error: error.message, filters });
            throw error;
        }
    }

    /**
     * Get ticket statistics
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} Ticket statistics
     */
    async getStatistics(filters = {}) {
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
            logger.error('Error getting ticket statistics', { error: error.message, filters });
            throw error;
        }
    }
}

module.exports = new TicketRepository();
