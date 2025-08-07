const { logger } = require('../../../config/logger');
const IFareCalculator = require('../interfaces/IFareCalculator');
const { PassengerDiscount } = require('../../../models/index.model');

/**
 * Multi-Route Fare Calculator - Single Responsibility: Calculate fares for multi-route journeys
 * Following Single Responsibility Principle - only handles multi-route fare calculations
 */
class MultiRouteFareCalculator extends IFareCalculator {
    constructor(stationBasedCalculator, stationService, fareRepository) {
        super();
        this.stationBasedCalculator = stationBasedCalculator;
        this.stationService = stationService;
        this.fareRepository = fareRepository;
    }

    /**
     * Get passenger multipliers from database
     * @returns {Object} Passenger multipliers
     */
    async getPassengerMultipliers() {
        try {
            const discounts = await PassengerDiscount.findAll({
                where: { isActive: true }
            });

            logger.info('Found passenger discounts from DB', {
                count: discounts.length,
                discounts: discounts.map(d => ({
                    passengerType: d.passengerType,
                    discountType: d.discountType,
                    discountValue: d.discountValue,
                    isValid: d.isCurrentlyValid()
                }))
            });

            const multipliers = {};
            
            for (const discount of discounts) {
                if (discount.isCurrentlyValid()) {
                    switch (discount.discountType) {
                        case 'percentage':
                            multipliers[discount.passengerType] = 1 - (parseFloat(discount.discountValue) / 100);
                            break;
                        case 'fixed_amount':
                            // For fixed amount, we'll use a percentage equivalent
                            multipliers[discount.passengerType] = 0.8; // Default 20% discount
                            break;
                        case 'free':
                            multipliers[discount.passengerType] = 0;
                            break;
                        default:
                            multipliers[discount.passengerType] = 1.0;
                    }
                    
                    logger.info(`Applied multiplier for ${discount.passengerType}`, {
                        discountType: discount.discountType,
                        discountValue: discount.discountValue,
                        multiplier: multipliers[discount.passengerType]
                    });
                } else {
                    // If discount is not valid, use full price
                    multipliers[discount.passengerType] = 1.0;
                    logger.info(`Discount for ${discount.passengerType} is not valid, using full price`);
                }
            }

            // Set defaults for passenger types not in database
            const defaultMultipliers = {
                adult: 1.0,
                elder: 1.0,
                teenager: 1.0,
                child: 1.0,
                senior: 1.0,
                student: 1.0
            };

            const finalMultipliers = { ...defaultMultipliers, ...multipliers };
            
            logger.info('Final passenger multipliers', finalMultipliers);
            
            return finalMultipliers;
        } catch (error) {
            logger.error('Error getting passenger multipliers', { error: error.message });
            
            // Fallback to default multipliers
            const fallbackMultipliers = {
                adult: 1.0,
                elder: 1.0,
                teenager: 1.0,
                child: 1.0,
                senior: 1.0,
                student: 1.0
            };
            
            logger.info('Using fallback multipliers', fallbackMultipliers);
            
            return fallbackMultipliers;
        }
    }

    /**
     * Find connections (common stations) between routes
     * @param {Array} route1Stations - Stations in route 1
     * @param {Array} route2Stations - Stations in route 2
     * @returns {Array} Common stations between routes
     */
    findConnections(route1Stations, route2Stations) {
        if (!route1Stations || !route2Stations || !Array.isArray(route1Stations) || !Array.isArray(route2Stations)) {
            return [];
        }
        
        const route1StationIds = route1Stations.map(station => station.stationId);
        const route2StationIds = route2Stations.map(station => station.stationId);
        
        return route1StationIds.filter(stationId => route2StationIds.includes(stationId));
    }

    /**
     * Plan journey by finding route segments and connections
     * @param {string} fromStation - Origin station
     * @param {string} toStation - Destination station
     * @returns {Object} Journey plan with segments and connections
     */
    async planJourney(fromStation, toStation) {
        try {
            // Step 1: Find routes containing from and to stations
            const [fromRoutes, toRoutes] = await Promise.all([
                this.stationService.findRoutesContainingStation(fromStation),
                this.stationService.findRoutesContainingStation(toStation)
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

            if (commonRoute) {
                // Direct journey on same route
                logger.info('Direct journey found', { routeId: commonRoute.routeId });
                
                const stationCount = await this.stationService.calculateStationCount(
                    commonRoute.routeId, 
                    fromStation, 
                    toStation
                );

                return {
                    isDirectJourney: true,
                    totalRoutes: 1,
                    totalStations: stationCount,
                    routeSegments: [{
                        routeId: commonRoute.routeId,
                        routeName: commonRoute.routeName || commonRoute.routeId,
                        originStationId: fromStation,
                        destinationStationId: toStation,
                        stationCount: stationCount
                    }],
                    connectionPoints: []
                };
            }

            // Step 3: Multi-route journey - find connections
            logger.info('Multi-route journey detected, finding connections');
            
            const allRoutes = await this.stationService.getAllRoutes();
            const routeSegments = [];
            const connectionPoints = [];
            let totalStations = 0;

            // Find the best path through connections
            const path = this.findBestPath(fromRoutes, toRoutes, allRoutes);
            
            if (path.length === 0) {
                throw new Error('No valid path found between stations');
            }

            // Build segments from the path
            for (let i = 0; i < path.length; i++) {
                const currentRoute = path[i];
                const nextRoute = path[i + 1];
                
                let originStationId, destinationStationId, segmentStationCount;
                
                if (i === 0) {
                    // First segment: from origin to connection
                    originStationId = fromStation;
                    if (nextRoute && currentRoute.stations && nextRoute.stations) {
                        const connections = this.findConnections(currentRoute.stations, nextRoute.stations);
                        destinationStationId = connections[0]; // Use first connection
                    } else {
                        destinationStationId = toStation; // Fallback to destination
                    }
                    segmentStationCount = await this.stationService.calculateStationCount(
                        currentRoute.routeId, originStationId, destinationStationId
                    );
                    if (nextRoute) {
                        connectionPoints.push(destinationStationId);
                    }
                } else if (i === path.length - 1) {
                    // Last segment: from connection to destination
                    const prevRoute = path[i - 1];
                    if (prevRoute.stations && currentRoute.stations) {
                        const connections = this.findConnections(prevRoute.stations, currentRoute.stations);
                        originStationId = connections[0]; // Use first connection
                    } else {
                        originStationId = fromStation; // Fallback to origin
                    }
                    destinationStationId = toStation;
                    segmentStationCount = await this.stationService.calculateStationCount(
                        currentRoute.routeId, originStationId, destinationStationId
                    );
                } else {
                    // Middle segments: from connection to connection
                    const prevRoute = path[i - 1];
                    const nextRoute = path[i + 1];
                    
                    let prevConnections = [];
                    let nextConnections = [];
                    
                    if (prevRoute.stations && currentRoute.stations) {
                        prevConnections = this.findConnections(prevRoute.stations, currentRoute.stations);
                    }
                    if (currentRoute.stations && nextRoute.stations) {
                        nextConnections = this.findConnections(currentRoute.stations, nextRoute.stations);
                    }
                    
                    originStationId = prevConnections[0] || fromStation;
                    destinationStationId = nextConnections[0] || toStation;
                    segmentStationCount = await this.stationService.calculateStationCount(
                        currentRoute.routeId, originStationId, destinationStationId
                    );
                    connectionPoints.push(destinationStationId);
                }

                routeSegments.push({
                    routeId: currentRoute.routeId,
                    routeName: currentRoute.routeName || currentRoute.routeId,
                    originStationId,
                    destinationStationId,
                    stationCount: segmentStationCount
                });

                totalStations += segmentStationCount;
            }

            return {
                isDirectJourney: false,
                totalRoutes: path.length,
                totalStations: totalStations,
                routeSegments,
                connectionPoints
            };

        } catch (error) {
            logger.error('Error planning journey', {
                error: error.message,
                fromStation,
                toStation
            });
            throw error;
        }
    }

    /**
     * Find best path through routes using connections
     * @param {Array} fromRoutes - Routes containing origin station
     * @param {Array} toRoutes - Routes containing destination station
     * @param {Array} allRoutes - All available routes
     * @returns {Array} Best path of routes
     */
    findBestPath(fromRoutes, toRoutes, allRoutes) {
        // Simple implementation: find shortest path through connections
        // For now, return first available path
        const path = [];
        
        // Find a route from origin
        const startRoute = fromRoutes[0];
        path.push(startRoute);
        
        // Find a route to destination that connects with start route
        const endRoute = toRoutes.find(route => {
            if (route.routeId === startRoute.routeId) return true;
            
            // Check if stations exist before finding connections
            if (!startRoute.stations || !route.stations) return false;
            
            const connections = this.findConnections(startRoute.stations, route.stations);
            return connections.length > 0;
        });
        
        if (endRoute && endRoute.routeId !== startRoute.routeId) {
            path.push(endRoute);
        }
        
        return path;
    }

    /**
     * Calculate fare for journey with multiple passengers
     * @param {string} fromStation - Origin station
     * @param {string} toStation - Destination station
     * @param {Object} passengerCounts - Passenger counts
     * @param {string} tripType - Trip type
     * @returns {Object} Journey fare calculation result
     */
    async calculateJourneyFareForMultiplePassengers(fromStation, toStation, passengerCounts, tripType = 'Oneway') {
        try {
            // Validate inputs
            const { numAdults = 0, numElder = 0, numTeenager = 0, numChild = 0 } = passengerCounts;
            const totalPassengers = numAdults + numElder + numTeenager + numChild;
            
            if (totalPassengers === 0) {
                throw new Error('At least one passenger is required');
            }

            logger.info('Calculating journey fare for multiple passengers', {
                fromStation,
                toStation,
                passengerCounts,
                tripType
            });

            // Step 1: Plan journey
            const journeyPlan = await this.planJourney(fromStation, toStation);
            
            // Step 2: Calculate fare for each segment
            const segmentFares = [];
            const fareAnalysis = [];
            let totalPrice = 0;

            for (const segment of journeyPlan.routeSegments) {
                // Get fare for this route
                const fare = await this.fareRepository.findActiveFareForRoute(segment.routeId);
                
                if (!fare) {
                    throw new Error(`No active fare found for route ${segment.routeId}`);
                }

                // Calculate base price for this segment using Fare model
                const basePrice = fare.calculateStationBasedPrice(segment.stationCount);
                
                // Apply trip type multiplier
                const tripPrice = fare.calculatePriceForTrip(segment.stationCount, tripType);
                
                logger.info('Segment fare calculation', {
                    segment: segment.routeName,
                    stationCount: segment.stationCount,
                    basePrice: basePrice,
                    tripPrice: tripPrice,
                    tripType: tripType
                });
                
                // Calculate breakdown for each passenger type
                const passengerMultipliers = await this.getPassengerMultipliers();

                const segmentBreakdown = [];
                let segmentTotalPrice = 0;

                // Calculate for each passenger type
                const passengerTypes = [
                    { type: 'adult', count: numAdults, multiplier: passengerMultipliers.adult },
                    { type: 'elder', count: numElder, multiplier: passengerMultipliers.elder },
                    { type: 'teenager', count: numTeenager, multiplier: passengerMultipliers.teenager },
                    { type: 'child', count: numChild, multiplier: passengerMultipliers.child }
                ];

                for (const passenger of passengerTypes) {
                    if (passenger.count > 0) {
                        const pricePerPerson = tripPrice * passenger.multiplier;
                        const subtotal = pricePerPerson * passenger.count;
                        
                        logger.info(`Calculating price for ${passenger.type}`, {
                            count: passenger.count,
                            multiplier: passenger.multiplier,
                            tripPrice: tripPrice,
                            pricePerPerson: pricePerPerson,
                            subtotal: subtotal
                        });
                        
                        segmentBreakdown.push({
                            type: passenger.type,
                            count: passenger.count,
                            pricePerPerson: Math.round(pricePerPerson / 1000) * 1000,
                            subtotal: Math.round(subtotal / 1000) * 1000
                        });
                        
                        segmentTotalPrice += subtotal;
                    }
                }

                segmentFares.push({
                    routeId: segment.routeId,
                    routeName: segment.routeName,
                    originStationId: segment.originStationId,
                    destinationStationId: segment.destinationStationId,
                    stationCount: segment.stationCount,
                    basePrice: basePrice,
                    tripPrice: tripPrice,
                    fareDetails: {
                        fareId: fare.fareId,
                        basePrice: fare.basePrice,
                        currency: fare.currency
                    }
                });

                fareAnalysis.push({
                    segment: segmentFares.length,
                    routeName: segment.routeName,
                    originStationId: segment.originStationId,
                    destinationStationId: segment.destinationStationId,
                    stationCount: segment.stationCount,
                    basePrice: basePrice,
                    tripPrice: tripPrice,
                    breakdown: segmentBreakdown,
                    segmentTotalPrice: Math.round(segmentTotalPrice / 1000) * 1000
                });

                totalPrice += segmentTotalPrice;
            }

            // Step 3: Calculate total price for each passenger type across all segments
            const passengerBreakdown = [];
            const passengerMultipliers = await this.getPassengerMultipliers();

            // Calculate for each passenger type
            const passengerTypes = [
                { type: 'adult', count: numAdults, multiplier: passengerMultipliers.adult },
                { type: 'elder', count: numElder, multiplier: passengerMultipliers.elder },
                { type: 'teenager', count: numTeenager, multiplier: passengerMultipliers.teenager },
                { type: 'child', count: numChild, multiplier: passengerMultipliers.child }
            ];

            for (const passenger of passengerTypes) {
                if (passenger.count > 0) {
                    let passengerTotalPrice = 0;
                    
                    // Calculate price for this passenger type across all segments
                    for (const segmentFare of segmentFares) {
                        const segmentPrice = segmentFare.tripPrice * passenger.multiplier;
                        passengerTotalPrice += segmentPrice;
                    }
                    
                    // Round to nearest 1000 VND
                    passengerTotalPrice = Math.round(passengerTotalPrice / 1000) * 1000;
                    
                    passengerBreakdown.push({
                        type: passenger.type,
                        count: passenger.count,
                        pricePerPerson: Math.round(passengerTotalPrice / passenger.count),
                        subtotal: passengerTotalPrice * passenger.count
                    });
                    
                    totalPrice += passengerTotalPrice * passenger.count;
                }
            }

            // Step 4: Simplify route segments by removing unnecessary fields
            const simplifiedRouteSegments = journeyPlan.routeSegments.map(segment => ({
                routeId: segment.routeId,
                routeName: segment.routeName,
                originStationId: segment.originStationId,
                destinationStationId: segment.destinationStationId,
                stationCount: segment.stationCount
            }));

            return {
                success: true,
                totalPrice,
                currency: 'VND',
                journeyDetails: {
                    isDirectJourney: journeyPlan.isDirectJourney,
                    totalRoutes: journeyPlan.totalRoutes,
                    totalStations: journeyPlan.totalStations,
                    routeSegments: simplifiedRouteSegments,
                    connectionPoints: journeyPlan.connectionPoints
                },
                segmentFares,
                passengerBreakdown,
                fareAnalysis,
                totalPassengers
            };

        } catch (error) {
            logger.error('Error calculating journey fare for multiple passengers', {
                error: error.message,
                fromStation,
                toStation,
                passengerCounts,
                tripType
            });
            throw error;
        }
    }

    // These methods are not implemented in this calculator as they belong to other calculators
    async calculateSinglePassengerFare(routeId, originStationId, destinationStationId, passengerType = 'adult', tripType = 'Oneway') {
        throw new Error('Single passenger fare calculation not implemented in MultiRouteFareCalculator');
    }

    async calculateStationBasedFare(fromStation, toStation, numAdults = 0, numElder = 0, numTeenager = 0, numChild = 0, tripType = 'Oneway') {
        throw new Error('Station-based fare calculation not implemented in MultiRouteFareCalculator');
    }

    async calculatePassBasedFare(routeId, passType, passengerType = 'adult') {
        throw new Error('Pass-based fare calculation not implemented in MultiRouteFareCalculator');
    }

    async calculateMultiRouteFare(routeSegments, passengerType = 'adult') {
        throw new Error('Multi-route fare calculation not implemented in MultiRouteFareCalculator');
    }

    async calculateFareForJourney(journeyPlan, passengerType, tripType) {
        throw new Error('Journey fare calculation not implemented in MultiRouteFareCalculator');
    }

    async calculateStationCount(routeId, originStationId, destinationStationId) {
        throw new Error('Station count calculation not implemented in MultiRouteFareCalculator');
    }

    async validateExitStation(ticketId, exitStationId) {
        throw new Error('Exit station validation not implemented in MultiRouteFareCalculator');
    }
}

module.exports = MultiRouteFareCalculator;
