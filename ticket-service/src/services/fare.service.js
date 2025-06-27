const { Fare, Ticket } = require('../models/index.model');
const { Op } = require('sequelize');
const { logger } = require('../config/logger');

class FareService {
    async createFare(fareData) {
        try {
            const fare = await Fare.create(fareData);
            logger.info('Fare created successfully', { fareId: fare.fareId, routeId: fare.routeId });
            return fare;
        } catch (error) {
            logger.error('Error creating fare', { error: error.message, fareData });
            throw error;
        }
    }

    async getAllFares(filters = {}) {
        try {
            const where = {};
            
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }
            
            if (filters.routeId) {
                where.routeId = filters.routeId;
            }
            
            if (filters.originStationId) {
                where.originStationId = filters.originStationId;
            }
            
            if (filters.destinationStationId) {
                where.destinationStationId = filters.destinationStationId;
            }
            
            if (filters.ticketType) {
                where.ticketType = filters.ticketType;
            }
            
            if (filters.passengerType) {
                where.passengerType = filters.passengerType;
            }

            if (filters.effectiveDate) {
                where.validFrom = { [Op.lte]: filters.effectiveDate };
                where[Op.or] = [
                    { validUntil: null },
                    { validUntil: { [Op.gte]: filters.effectiveDate } }
                ];
            }

            const fares = await Fare.findAll({
                where,
                include: [
                    {
                        model: Ticket,
                        as: 'tickets',
                        attributes: ['ticketId', 'status', 'createdAt'],
                        required: false
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
            
            return fares;
        } catch (error) {
            logger.error('Error fetching fares', { error: error.message, filters });
            throw error;
        }
    }

    async getFareById(fareId) {
        try {
            const fare = await Fare.findByPk(fareId, {
                include: [
                    {
                        model: Ticket,
                        as: 'tickets',
                        attributes: ['ticketId', 'status', 'finalPrice', 'createdAt']
                    }
                ]
            });
            
            if (!fare) {
                throw new Error('Fare not found');
            }
            
            return fare;
        } catch (error) {
            logger.error('Error fetching fare by ID', { error: error.message, fareId });
            throw error;
        }
    }

    async updateFare(fareId, updateData) {
        try {
            const fare = await Fare.findByPk(fareId);
            
            if (!fare) {
                throw new Error('Fare not found');
            }
            
            const updatedFare = await fare.update(updateData);
            logger.info('Fare updated successfully', { fareId });
            return updatedFare;
        } catch (error) {
            logger.error('Error updating fare', { error: error.message, fareId });
            throw error;
        }
    }

    async deleteFare(fareId) {
        try {
            const fare = await Fare.findByPk(fareId);
            
            if (!fare) {
                throw new Error('Fare not found');
            }
            
            // Check if fare is used in any active tickets
            const activeTickets = await Ticket.count({
                where: {
                    fareId,
                    status: { [Op.in]: ['active', 'used'] },
                    isActive: true
                }
            });
            
            if (activeTickets > 0) {
                throw new Error('Cannot delete fare that is used in active tickets');
            }
            
            // Soft delete - set isActive to false
            await fare.update({ isActive: false });
            logger.info('Fare deactivated successfully', { fareId });
            return { message: 'Fare deactivated successfully' };
        } catch (error) {
            logger.error('Error deleting fare', { error: error.message, fareId });
            throw error;
        }
    }

    async getFaresByRoute(routeId, filters = {}) {
        try {
            const where = { routeId, isActive: true };
            
            if (filters.ticketType) {
                where.ticketType = filters.ticketType;
            }
            
            if (filters.passengerType) {
                where.passengerType = filters.passengerType;
            }
            
            if (filters.effectiveDate) {
                where.validFrom = { [Op.lte]: filters.effectiveDate };
                where[Op.or] = [
                    { validUntil: null },
                    { validUntil: { [Op.gte]: filters.effectiveDate } }
                ];
            }

            const fares = await Fare.findAll({
                where,
                order: [['ticketType', 'ASC'], ['passengerType', 'ASC']]
            });
            
            return fares;
        } catch (error) {
            logger.error('Error fetching fares by route', { error: error.message, routeId });
            throw error;
        }
    }

    async getFaresBetweenStations(originStationId, destinationStationId, filters = {}) {
        try {
            const where = {
                originStationId,
                destinationStationId,
                isActive: true
            };
            
            if (filters.ticketType) {
                where.ticketType = filters.ticketType;
            }
            
            if (filters.passengerType) {
                where.passengerType = filters.passengerType;
            }
            
            const effectiveDate = filters.effectiveDate || new Date();
            where.validFrom = { [Op.lte]: effectiveDate };
            where[Op.or] = [
                { validUntil: null },
                { validUntil: { [Op.gte]: effectiveDate } }
            ];

            const fares = await Fare.findAll({
                where,
                order: [['basePrice', 'ASC']]
            });
            
            return fares;
        } catch (error) {
            logger.error('Error fetching fares between stations', { 
                error: error.message, 
                originStationId, 
                destinationStationId 
            });
            throw error;
        }
    }

    async calculateFarePrice(fareId, options = {}) {
        try {
            const fare = await Fare.findByPk(fareId);
            
            if (!fare) {
                throw new Error('Fare not found');
            }
            
            if (!fare.isCurrentlyValid()) {
                throw new Error('Fare is not currently valid');
            }
            
            const price = fare.calculatePrice();
            
            return {
                fareId: fare.fareId,
                basePrice: fare.basePrice,
                finalPrice: price,
                currency: fare.currency
            };
        } catch (error) {
            logger.error('Error calculating fare price', { error: error.message, fareId });
            throw error;
        }
    }

    async getActiveFares() {
        try {
            const currentDate = new Date();
            return await Fare.findAll({
                where: {
                    isActive: true,
                    validFrom: { [Op.lte]: currentDate },
                    [Op.or]: [
                        { validUntil: null },
                        { validUntil: { [Op.gte]: currentDate } }
                    ]
                },
                order: [['routeId', 'ASC'], ['ticketType', 'ASC'], ['passengerType', 'ASC']]
            });
        } catch (error) {
            logger.error('Error fetching active fares', { error: error.message });
            throw error;
        }
    }

    async getFareStatistics(filters = {}) {
        try {
            const where = { isActive: true };
            
            if (filters.routeId) {
                where.routeId = filters.routeId;
            }
            
            if (filters.dateFrom && filters.dateTo) {
                where.createdAt = {
                    [Op.between]: [filters.dateFrom, filters.dateTo]
                };
            }

            const stats = await Fare.findAll({
                where,
                attributes: [
                    'ticketType',
                    'passengerType',
                    [Fare.sequelize.fn('COUNT', '*'), 'fareCount'],
                    [Fare.sequelize.fn('AVG', Fare.sequelize.col('basePrice')), 'averagePrice'],
                    [Fare.sequelize.fn('MIN', Fare.sequelize.col('basePrice')), 'minPrice'],
                    [Fare.sequelize.fn('MAX', Fare.sequelize.col('basePrice')), 'maxPrice']
                ],
                group: ['ticketType', 'passengerType'],
                raw: true
            });
            
            return stats;
        } catch (error) {
            logger.error('Error generating fare statistics', { error: error.message, filters });
            throw error;
        }
    }

    async bulkUpdateFares(filters, updateData) {
        try {
            const where = {};
            
            if (filters.routeId) {
                where.routeId = filters.routeId;
            }
            
            if (filters.ticketType) {
                where.ticketType = filters.ticketType;
            }
            
            if (filters.passengerType) {
                where.passengerType = filters.passengerType;
            }
            
            where.isActive = true;

            const [updatedCount] = await Fare.update(updateData, {
                where,
                returning: true
            });
            
            logger.info('Bulk fare update completed', { updatedCount, filters, updateData });
            return { updatedCount, message: `${updatedCount} fares updated successfully` };
        } catch (error) {
            logger.error('Error in bulk fare update', { error: error.message, filters });
            throw error;
        }
    }

    async getFaresByZone(zones, filters = {}) {
        try {
            const where = {
                zones: { [Op.lte]: zones },
                isActive: true
            };
            
            if (filters.ticketType) {
                where.ticketType = filters.ticketType;
            }
            
            if (filters.passengerType) {
                where.passengerType = filters.passengerType;
            }
            
            const effectiveDate = filters.effectiveDate || new Date();
            where.validFrom = { [Op.lte]: effectiveDate };
            where[Op.or] = [
                { validUntil: null },
                { validUntil: { [Op.gte]: effectiveDate } }
            ];

            const fares = await Fare.findAll({
                where,
                order: [['zones', 'ASC'], ['basePrice', 'ASC']]
            });
            
            return fares;
        } catch (error) {
            logger.error('Error fetching fares by zone', { error: error.message, zones });
            throw error;
        }
    }
}

module.exports = new FareService();
