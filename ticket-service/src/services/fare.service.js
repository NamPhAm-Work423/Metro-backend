const { Fare, Ticket } = require('../models/index.model');
const { Op } = require('sequelize');
const { logger } = require('../config/logger');
const TransportClient = require('../grpc/transportClient');
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
            
            // Note: originStationId, destinationStationId, ticketType, passengerType 
            // filters removed as these columns don't exist in current Fare schema
            
            // Note: effectiveDate filtering removed as columns don't exist in current schema

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

    async getAllActiveFares() {
        try {
            const fares = await Fare.findAll({ where: { isActive: true } });
            logger.info('Active fares retrieved successfully', { fares });
            return fares;
        } catch (error) {
            logger.error('Error fetching active fares', { error: error.message });
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
            
            // Note: effectiveDate filtering removed as columns don't exist in current schema

            const fares = await Fare.findAll({
                where,
                order: [['createdAt', 'DESC']]
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
                isActive: true
            };
            
            // Note: originStationId, destinationStationId, ticketType, passengerType 
            // filters removed as these columns don't exist in current Fare schema
            
            // Note: effectiveDate filtering removed as columns don't exist in current schema

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
            return await Fare.findAll({
                where: {
                    isActive: true
                },
                order: [['routeId', 'ASC'], ['createdAt', 'DESC']]
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
                isActive: true
            };
            
            // Note: zones column doesn't exist in current Fare schema
            // This method now returns all active fares since zone-based filtering is not available

            const fares = await Fare.findAll({
                where,
                order: [['basePrice', 'ASC']]
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
            // First, try to get routes between the two stations to find the route
            let actualRouteId = routeId;
            
            // If routeId is the default mock value, find the actual route
            if (routeId === 'default-route-001') {
                try {
                    const routesResponse = await TransportClient.getRoutesByStations(originStationId, destinationStationId);
                    if (routesResponse && routesResponse.routes && routesResponse.routes.length > 0) {
                        actualRouteId = routesResponse.routes[0].routeId;
                        logger.info('Found route between stations', { 
                            originStationId, 
                            destinationStationId, 
                            routeId: actualRouteId 
                        });
                    } else {
                        throw new Error('No route found between the specified stations');
                    }
                } catch (grpcError) {
                    logger.warn('Failed to get routes via gRPC, using fallback calculation', { 
                        error: grpcError.message,
                        originStationId,
                        destinationStationId 
                    });
                    // Fallback: return a reasonable station count estimate based on different station IDs
                    // For now, use a moderate station count that will calculate a fair price
                    return 5; // Default reasonable station count for pricing
                }
            }

            // Now try to calculate the exact station count using the transport service
            try {
                // First try the direct CalculateStationCount method
                try {
                    const stationCountResponse = await TransportClient.calculateStationCount(actualRouteId, originStationId, destinationStationId);
                    
                    if (stationCountResponse && stationCountResponse.stationCount) {
                        logger.info('Calculated station count via direct gRPC call', {
                            routeId: actualRouteId,
                            originStationId,
                            destinationStationId,
                            stationCount: stationCountResponse.stationCount
                        });
                        
                        return stationCountResponse.stationCount;
                    }
                } catch (directError) {
                    logger.debug('Direct CalculateStationCount failed, trying route stations method', {
                        error: directError.message
                    });
                }

                // Fallback: Use route stations to calculate manually
                const routeStationsResponse = await TransportClient.getRouteStations(actualRouteId);
                
                if (routeStationsResponse && routeStationsResponse.routeStations) {
                    const routeStations = routeStationsResponse.routeStations;
                    
                    const originStation = routeStations.find(rs => rs.stationId === originStationId);
                    const destinationStation = routeStations.find(rs => rs.stationId === destinationStationId);
                    
                    if (!originStation || !destinationStation) {
                        throw new Error('One or both stations not found on the route');
                    }
                    
                    const stationCount = Math.abs(destinationStation.sequence - originStation.sequence);
                    
                    logger.info('Calculated station count via route stations method', {
                        routeId: actualRouteId,
                        originStationId,
                        destinationStationId,
                        stationCount
                    });
                    
                    return stationCount;
                } else {
                    throw new Error('No route stations data received from transport service');
                }
            } catch (grpcError) {
                logger.warn('Transport service gRPC call failed, using fallback', { 
                    error: grpcError.message,
                    routeId: actualRouteId,
                    originStationId,
                    destinationStationId
                });
                
                // Fallback calculation: estimate based on whether stations are different
                if (originStationId === destinationStationId) {
                    return 1; // Same station
                } else {
                    // Different stations - use a moderate estimate for fair pricing
                    return 5; // Default reasonable station count for fare calculation
                }
            }
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
     * Calculate fare price for single passenger type (backward compatibility)
     * @param {string} routeId - The route ID
     * @param {string} originStationId - The origin station ID
     * @param {string} destinationStationId - The destination station ID
     * @param {string} passengerType - The passenger type
     * @param {string} tripType - The trip type (Oneway/Return)
     * @returns {Promise<Object>} Calculated fare information
     */
    async calculateSinglePassengerFare(routeId, originStationId, destinationStationId, passengerType = 'adult', tripType = 'Oneway') {
        try {
            // Calculate number of stations
            const stationCount = await this.calculateStationCount(routeId, originStationId, destinationStationId);
            
            // Get base fare for the route and passenger type
            const fare = await Fare.findOne({
                where: {
                    routeId,
                    ticketType: tripType.toLowerCase(),
                    passengerType: 'adult', // Always use adult as base
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
            
            // Apply passenger type discount
            const passengerMultipliers = {
                adult: 1.0,
                senior: 0.8,
                teen: 0.7, 
                child: 0.5
            };
            
            calculatedPrice = calculatedPrice * (passengerMultipliers[passengerType] || 1.0);
            
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
                    stationCount,
                    finalPrice: calculatedPrice
                }
            };
        } catch (error) {
            logger.error('Error calculating single passenger fare', { 
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
                const segmentFare = await this.calculateSinglePassengerFare(
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

            // Get route ID from ticket's fare
            const fare = await Fare.findByPk(ticket.fareId);
            if (!fare) {
                throw new Error('Fare information not found for ticket');
            }

            // Calculate additional fare needed using single passenger method
            const additionalFare = await this.calculateSinglePassengerFare(
                fare.routeId,
                ticket.destinationStationId, // Original destination becomes new origin
                exitStationId,
                'adult', // Use adult price for additional fare
                'Oneway'
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
     * Find routes that contain a specific station
     * @param {string} stationId - The station ID to search for
     * @returns {Promise<Array>} List of routes containing the station
     */
    async findRoutesContainingStation(stationId) {
        try {
            const TransportClient = require('../grpc/transportClient');
            
            // Get all routes
            const allRoutesResponse = await TransportClient.getAllRoutes();
            const allRoutes = (allRoutesResponse && allRoutesResponse.routes) ? allRoutesResponse.routes : [];
            
            const routesContainingStation = [];
            
            for (const route of allRoutes) {
                try {
                    // Get stations for this route
                    const routeStationsResponse = await TransportClient.getRouteStations(route.routeId);
                    const routeStations = (routeStationsResponse && routeStationsResponse.routeStations) ? routeStationsResponse.routeStations : [];
                    
                    // Check if station exists in this route
                    const stationExists = routeStations.some(station => station.stationId === stationId);
                    
                    if (stationExists) {
                        routesContainingStation.push({
                            ...route,
                            stations: routeStations
                        });
                    }
                } catch (error) {
                    logger.debug(`Error checking route ${route.routeId} for station ${stationId}:`, error.message);
                }
            }
            
            return routesContainingStation;
        } catch (error) {
            logger.error('Error finding routes containing station', {
                error: error.message,
                stationId
            });
            return [];
        }
    }

    /**
     * Calculate fare price based on number of stations and multiple passenger types
     * @param {string} fromStation - The origin station ID
     * @param {string} toStation - The destination station ID
     * @param {number} numAdults - Number of adult passengers
     * @param {number} numElder - Number of elderly passengers  
     * @param {number} numTeenager - Number of teenager passengers
     * @param {number} numChild - Number of child passengers
     * @param {string} tripType - The trip type (Oneway/Return)
     * @returns {Promise<Object>} Calculated fare information with totals
     */
    async calculateStationBasedFare(fromStation, toStation, numAdults = 0, numElder = 0, numTeenager = 0, numChild = 0, tripType = 'Oneway') {
        try {
            // Validate inputs
            const totalPassengers = numAdults + numElder + numTeenager + numChild;
            if (totalPassengers === 0) {
                throw new Error('At least one passenger is required');
            }

            logger.info('Calculating station-based fare', {
                fromStation,
                toStation,
                totalPassengers,
                tripType
            });

            // Step 1: Find routes containing from and to stations
            const [fromRoutes, toRoutes] = await Promise.all([
                this.findRoutesContainingStation(fromStation),
                this.findRoutesContainingStation(toStation)
            ]);

            logger.info('Found routes for stations', {
                fromStation,
                fromRoutesCount: fromRoutes.length,
                toStation, 
                toRoutesCount: toRoutes.length
            });

            if (fromRoutes.length === 0) {
                throw new Error(`Station ${fromStation} not found in any route`);
            }

            if (toRoutes.length === 0) {
                throw new Error(`Station ${toStation} not found in any route`);
            }

            // Step 2: Check if there's a common route (direct journey)
            const commonRoute = fromRoutes.find(fromRoute => 
                toRoutes.some(toRoute => toRoute.routeId === fromRoute.routeId)
            );

            let routeId, stationCount, baseFare;

            if (commonRoute) {
                // Direct journey on same route
                logger.info('Direct journey found', { routeId: commonRoute.routeId });
                routeId = commonRoute.routeId;
                
                // Get fare for this route
                baseFare = await Fare.findOne({
                    where: {
                        routeId,
                        isActive: true
                    }
                });

                if (!baseFare) {
                    // Fallback to any active fare
                    baseFare = await Fare.findOne({
                        where: { isActive: true },
                        order: [['createdAt', 'DESC']]
                    });
                    
                    if (!baseFare) {
                        throw new Error('No active fares found in the system');
                    }
                }

                // Calculate stations in the same route
                stationCount = await this.calculateStationCount(routeId, fromStation, toStation);
            } else {
                // Multi-route journey - use simplified calculation for now
                logger.info('Multi-route journey detected', {
                    fromRoutes: fromRoutes.map(r => r.routeId),
                    toRoutes: toRoutes.map(r => r.routeId)
                });

                // For multi-route, use base fare and estimate station count
                baseFare = await Fare.findOne({
                    where: { isActive: true },
                    order: [['createdAt', 'DESC']]
                });

                if (!baseFare) {
                    throw new Error('No active fares found in the system');
                }

                routeId = baseFare.routeId;
                // Estimate station count for multi-route (simplified)
                stationCount = 8; // Default reasonable count for cross-route journeys
            }
            
            // Calculate base price based on station count
            let baseStationPrice = baseFare.calculateStationBasedPrice(stationCount);
            
            // Apply trip type multiplier
            baseStationPrice = baseFare.calculatePriceForTrip(stationCount, tripType);
            
            // Define passenger type multipliers
            const passengerMultipliers = {
                adult: 1.0,     // 100% of base price
                elder: 0.8,     // 20% discount for elderly (senior)
                teenager: 0.7,  // 30% discount for teenagers
                child: 0.5      // 50% discount for children
            };

            // Calculate prices for each passenger type
            const passengerBreakdown = [];
            let totalPrice = 0;
            let totalPassengerCount = 0;

            // Adults
            if (numAdults > 0) {
                const adultPrice = Math.round((baseStationPrice * passengerMultipliers.adult) / 1000) * 1000;
                const adultTotal = adultPrice * numAdults;
                passengerBreakdown.push({
                    type: 'adult',
                    count: numAdults,
                    pricePerPerson: adultPrice,
                    subtotal: adultTotal
                });
                totalPrice += adultTotal;
                totalPassengerCount += numAdults;
            }

            // Elderly
            if (numElder > 0) {
                const elderPrice = Math.round((baseStationPrice * passengerMultipliers.elder) / 1000) * 1000;
                const elderTotal = elderPrice * numElder;
                passengerBreakdown.push({
                    type: 'elder',
                    count: numElder,
                    pricePerPerson: elderPrice,
                    subtotal: elderTotal
                });
                totalPrice += elderTotal;
                totalPassengerCount += numElder;
            }

            // Teenagers
            if (numTeenager > 0) {
                const teenPrice = Math.round((baseStationPrice * passengerMultipliers.teenager) / 1000) * 1000;
                const teenTotal = teenPrice * numTeenager;
                passengerBreakdown.push({
                    type: 'teenager',
                    count: numTeenager,
                    pricePerPerson: teenPrice,
                    subtotal: teenTotal
                });
                totalPrice += teenTotal;
                totalPassengerCount += numTeenager;
            }

            // Children
            if (numChild > 0) {
                const childPrice = Math.round((baseStationPrice * passengerMultipliers.child) / 1000) * 1000;
                const childTotal = childPrice * numChild;
                passengerBreakdown.push({
                    type: 'child',
                    count: numChild,
                    pricePerPerson: childPrice,
                    subtotal: childTotal
                });
                totalPrice += childTotal;
                totalPassengerCount += numChild;
            }

            return {
                routeId,
                originStationId: fromStation,
                destinationStationId: toStation,
                stationCount,
                basePrice: totalPrice, // Total price for all passengers
                tripType,
                currency: baseFare.currency,
                totalPassengers: totalPassengerCount,
                passengerBreakdown,
                priceBreakdown: {
                    baseFarePerAdult: baseStationPrice,
                    stationCount,
                    tripMultiplier: tripType === 'Return' ? 1.5 : 1.0,
                    totalPrice,
                    currency: baseFare.currency
                }
            };
        } catch (error) {
            logger.error('Error calculating station-based fare', { 
                error: error.message, 
                fromStation, 
                toStation,
                numAdults,
                numElder,
                numTeenager,
                numChild,
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
                    isActive: true
                },
                order: [
                    ['routeId', 'ASC'],
                    ['basePrice', 'ASC']
                ]
            });

            // Group fares by route (since model is simplified)
            const faresByRoute = fares.reduce((acc, fare) => {
                const key = fare.routeId;
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push({
                    fareId: fare.fareId,
                    routeId: fare.routeId,
                    basePrice: fare.basePrice,
                    currency: fare.currency,
                    isActive: fare.isActive
                });
                return acc;
            }, {});

            return {
                routeId,
                fareRoutes: faresByRoute,
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
}

module.exports = new FareService();
