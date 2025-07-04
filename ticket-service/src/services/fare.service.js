const { Fare, Ticket } = require('../models/index.model');
const { Op } = require('sequelize');
const { logger } = require('../config/logger');
// const axios = require('axios');

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
    /**In 1 route there are many fares, each route has different base price
     * 1-5 Station: basePrice
     * 6-10 Station: basePrice*1.2
     * 11-15 Station: basePrice*1.4
     * 16-20 Station: basePrice*1.6
     * 21-25 Station: basePrice*1.8
     * >25 Station: basePrice*2
     * Return ticket: Oneway*1.5
     * In long term ticket, the price is set by admin
     * day_pass: 1 day
     * weekly_pass: 7 days
     * monthly_pass: 30 days
     * yearly_pass: 365 days
     * lifetime_pass: 100 years
    */
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

    async calculateFarePrice(fareId) {
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

    /**
     * Calculate the number of stations between origin and destination
     * @param {string} routeId - The route ID
     * @param {string} originStationId - The origin station ID
     * @param {string} destinationStationId - The destination station ID
     * @returns {Promise<number>} Number of stations passenger will pass through
     */
    async calculateStationCount(routeId, originStationId, destinationStationId) {
        try {
            // This would typically require calling the transport service
            // For now, we'll implement a mock calculation
            // In a real implementation, you'd make a gRPC or HTTP call to transport service
            
            // Mock implementation - replace with actual transport service call
            const mockRouteStations = [
                { stationId: originStationId, sequence: 1 },
                { stationId: 'station2', sequence: 2 },
                { stationId: 'station3', sequence: 3 },
                { stationId: destinationStationId, sequence: 4 }
            ];
            
            const originSequence = mockRouteStations.find(rs => rs.stationId === originStationId)?.sequence;
            const destinationSequence = mockRouteStations.find(rs => rs.stationId === destinationStationId)?.sequence;
            
            if (!originSequence || !destinationSequence) {
                throw new Error('Station not found on route');
            }
            
            return Math.abs(destinationSequence - originSequence);
        } catch (error) {
            logger.error('Error calculating station count', { 
                error: error.message, 
                routeId, 
                originStationId, 
                destinationStationId 
            });
            throw error;
        }
    }

    /**
     * Calculate fare for pass-based tickets (day/week/month/year/lifetime)
     * @param {string} routeId - The route ID
     * @param {string} passType - The pass type (day_pass, weekly_pass, etc.)
     * @param {string} passengerType - The passenger type
     * @returns {Promise<Object>} Calculated fare information
     */
    async calculatePassBasedFare(routeId, passType, passengerType = 'adult') {
        try {
            // Get base fare for the route
            const fare = await Fare.findOne({
                where: {
                    routeId,
                    ticketType: passType,
                    passengerType,
                    isActive: true
                }
            });

            if (!fare) {
                throw new Error(`No fare configuration found for ${passType} on route ${routeId}`);
            }

            // Calculate duration in days
            let durationDays = 0;
            switch(passType) {
                case 'day_pass': durationDays = 1; break;
                case 'weekly_pass': durationDays = 7; break;
                case 'monthly_pass': durationDays = 30; break;
                case 'yearly_pass': durationDays = 365; break;
                case 'lifetime_pass': durationDays = 36500; break; // 100 years
                default: throw new Error('Invalid pass type');
            }

            // Base calculation
            const basePrice = fare.calculatePrice();
            const pricePerDay = basePrice / durationDays;

            return {
                routeId,
                passType,
                passengerType,
                durationDays,
                basePrice,
                pricePerDay,
                currency: fare.currency,
                priceBreakdown: {
                    basePrice,
                    durationDays,
                    pricePerDay,
                    passengerType,
                    passType
                }
            };
        } catch (error) {
            logger.error('Error calculating pass-based fare', {
                error: error.message,
                routeId,
                passType,
                passengerType
            });
            throw error;
        }
    }

    /**
     * Calculate fare for multi-route journey
     * @param {Array<{routeId: string, originStationId: string, destinationStationId: string}>} routeSegments
     * @param {string} passengerType
     * @returns {Promise<Object>} Total fare calculation
     */
    async calculateMultiRouteFare(routeSegments, passengerType = 'adult') {
        try {
            let totalPrice = 0;
            const priceBreakdown = [];

            // Calculate fare for each route segment separately
            for (const segment of routeSegments) {
                const segmentFare = await this.calculateStationBasedFare(
                    segment.routeId,
                    segment.originStationId,
                    segment.destinationStationId,
                    passengerType
                );
                totalPrice += segmentFare.basePrice;
                priceBreakdown.push({
                    routeId: segment.routeId,
                    originStationId: segment.originStationId,
                    destinationStationId: segment.destinationStationId,
                    stationCount: segmentFare.stationCount,
                    segmentPrice: segmentFare.basePrice
                });
            }

            return {
                totalPrice,
                currency: 'VND',
                routeSegments: routeSegments.length,
                priceBreakdown,
                passengerType
            };
        } catch (error) {
            logger.error('Error calculating multi-route fare', {
                error: error.message,
                routeSegments,
                passengerType
            });
            throw error;
        }
    }

    /**
     * Validate if passenger can exit at station with current ticket
     * @param {string} ticketId - The ticket ID
     * @param {string} exitStationId - The exit station ID
     * @returns {Promise<{canExit: boolean, additionalFare?: number}>}
     */
    async validateExitStation(ticketId, exitStationId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            if (!ticket) {
                throw new Error('Ticket not found');
            }

            // For unlimited passes, always allow exit
            if (ticket.ticketType.includes('pass')) {
                return { canExit: true };
            }

            // For single/return tickets, check if exit station matches
            if (ticket.destinationStationId === exitStationId) {
                return { canExit: true };
            }

            // Calculate additional fare needed
            const additionalFare = await this.calculateStationBasedFare(
                ticket.routeId,
                ticket.destinationStationId, // Original destination becomes new origin
                exitStationId,
                ticket.passengerType
            );

            return {
                canExit: false,
                additionalFare: additionalFare.basePrice,
                message: 'Additional fare payment required'
            };
        } catch (error) {
            logger.error('Error validating exit station', {
                error: error.message,
                ticketId,
                exitStationId
            });
            throw error;
        }
    }

    /**
     * Calculate fare price based on number of stations (per-trip basis)
     * @param {string} routeId - The route ID
     * @param {string} originStationId - The origin station ID
     * @param {string} destinationStationId - The destination station ID
     * @param {string} passengerType - The passenger type
     * @param {string} tripType - The trip type (Oneway/Return)
     * @returns {Promise<Object>} Calculated fare information
     */
    async calculateStationBasedFare(routeId, originStationId, destinationStationId, passengerType = 'adult', tripType = 'Oneway') {
        try {
            // Calculate number of stations
            const stationCount = await this.calculateStationCount(routeId, originStationId, destinationStationId);
            
            // Get base fare for the route and passenger type
            const fare = await Fare.findOne({
                where: {
                    routeId,
                    ticketType: tripType,
                    passengerType,
                    isActive: true,
                    effectiveFrom: { [Op.lte]: new Date() },
                    [Op.or]: [
                        { effectiveUntil: null },
                        { effectiveUntil: { [Op.gte]: new Date() } }
                    ]
                }
            });

            if (!fare) {
                throw new Error(`No valid fare found for route ${routeId} and passenger type ${passengerType}`);
            }
            
            // Calculate base price based on station count
            let calculatedPrice = fare.calculateStationBasedPrice(stationCount);
            
            // Apply trip type multiplier
            calculatedPrice = fare.calculatePriceForTrip(stationCount, tripType);
            
            // Round to nearest 1000 VND for convenience
            calculatedPrice = Math.round(calculatedPrice / 1000) * 1000;
            
            return {
                routeId,
                originStationId,
                destinationStationId,
                stationCount,
                basePrice: calculatedPrice,
                passengerType,
                tripType,
                currency: fare.currency,
                priceBreakdown: {
                    baseFare: fare.basePrice,
                    pricePerStation: fare.pricePerStation,
                    stationCount,
                    zones: fare.zones,
                    finalPrice: calculatedPrice
                }
            };
        } catch (error) {
            logger.error('Error calculating station-based fare', { 
                error: error.message, 
                routeId, 
                originStationId, 
                destinationStationId,
                passengerType,
                tripType
            });
            throw error;
        }
    }

    /**
     * Get all available fares for a route with pricing details
     * @param {string} routeId 
     * @returns {Promise<Array>} List of fares with pricing
     */
    async getRouteFareDetails(routeId) {
        try {
            const fares = await Fare.findAll({
                where: {
                    routeId,
                    isActive: true,
                    effectiveFrom: { [Op.lte]: new Date() },
                    [Op.or]: [
                        { effectiveUntil: null },
                        { effectiveUntil: { [Op.gte]: new Date() } }
                    ]
                },
                order: [
                    ['ticketType', 'ASC'],
                    ['passengerType', 'ASC']
                ]
            });

            // Group fares by ticket type
            const faresByType = fares.reduce((acc, fare) => {
                const key = fare.ticketType;
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push({
                    fareId: fare.fareId,
                    passengerType: fare.passengerType,
                    basePrice: fare.basePrice,
                    pricePerStation: fare.pricePerStation,
                    zones: fare.zones,
                    currency: fare.currency
                });
                return acc;
            }, {});

            return {
                routeId,
                fareTypes: faresByType,
                currency: fares[0]?.currency || 'VND',
                effectiveDate: new Date()
            };
        } catch (error) {
            logger.error('Error getting route fare details', {
                error: error.message,
                routeId
            });
            throw error;
        }
    }

    /**
     * Calculate fare for pass upgrade
     * @param {string} currentTicketId Current pass ticket ID
     * @param {string} newPassType Target pass type
     */
    async calculatePassUpgrade(currentTicketId, newPassType) {
        try {
            const currentTicket = await Ticket.findByPk(currentTicketId);
            if (!currentTicket || !currentTicket.ticketType.includes('pass')) {
                throw new Error('Invalid current ticket - must be a pass type ticket');
            }

            // Get current and new pass fares
            const [currentFare, newFare] = await Promise.all([
                Fare.findByPk(currentTicket.fareId),
                Fare.findOne({
                    where: {
                        routeId: currentTicket.routeId,
                        ticketType: newPassType,
                        passengerType: currentTicket.passengerType,
                        isActive: true
                    }
                })
            ]);

            if (!newFare) {
                throw new Error(`No fare found for ${newPassType}`);
            }

            // Calculate remaining value of current pass
            const now = new Date();
            const totalDays = (currentTicket.validUntil - currentTicket.validFrom) / (1000 * 60 * 60 * 24);
            const remainingDays = (currentTicket.validUntil - now) / (1000 * 60 * 60 * 24);
            const remainingValue = (remainingDays / totalDays) * currentTicket.originalPrice;

            // Calculate upgrade price
            const newPassPrice = newFare.calculatePrice();
            const upgradeCost = Math.max(0, newPassPrice - remainingValue);

            return {
                currentPassType: currentTicket.ticketType,
                newPassType,
                remainingValue,
                newPassPrice,
                upgradeCost: Math.round(upgradeCost / 1000) * 1000, // Round to nearest 1000
                currency: newFare.currency
            };
        } catch (error) {
            logger.error('Error calculating pass upgrade', {
                error: error.message,
                currentTicketId,
                newPassType
            });
            throw error;
        }
    }
}

module.exports = new FareService();
