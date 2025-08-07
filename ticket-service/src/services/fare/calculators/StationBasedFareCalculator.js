const { logger } = require('../../../config/logger');
const IFareCalculator = require('../interfaces/IFareCalculator');
const { PassengerDiscount } = require('../../../models/index.model');

/**
 * Station-Based Fare Calculator - Single Responsibility: Calculate fares based on station count
 * Following Single Responsibility Principle - only handles station-based fare calculations
 */
class StationBasedFareCalculator extends IFareCalculator {
    constructor(fareRepository, stationService) {
        super();
        this.fareRepository = fareRepository;
        this.stationService = stationService;
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
     * Calculate fare for single passenger
     */
    async calculateSinglePassengerFare(routeId, originStationId, destinationStationId, passengerType = 'adult', tripType = 'Oneway') {
        try {
            // Calculate number of stations
            const stationCount = await this.stationService.calculateStationCount(routeId, originStationId, destinationStationId);
            
            // Get base fare for the route and passenger type
            const fare = await this.fareRepository.findOneByRouteAndType(
                routeId, 
                tripType.toLowerCase(), 
                'adult' // Always use adult as base
            );

            if (!fare) {
                throw new Error(`No valid fare found for route ${routeId} and passenger type ${passengerType}`);
            }
            
            // Calculate base price based on station count
            let calculatedPrice = fare.calculateStationBasedPrice(stationCount);
            
            // Apply trip type multiplier
            calculatedPrice = fare.calculatePriceForTrip(stationCount, tripType);
            
            // Get passenger multipliers from database
            const passengerMultipliers = await this.getPassengerMultipliers();
            
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
     * Calculate fare for multiple passengers
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

            if (!commonRoute) {
                // Multi-route journey - this calculator only handles single route
                throw new Error('Multi-route journey detected. Please use MultiRouteFareCalculator for this journey.');
            }

            // Direct journey on same route
            logger.info('Direct journey found', { routeId: commonRoute.routeId });
            const routeId = commonRoute.routeId;
            
            // Get fare for this route
            const baseFare = await this.fareRepository.findActiveFareForRoute(routeId);

            if (!baseFare) {
                // Fallback to any active fare
                const activeFares = await this.fareRepository.findActiveFares();
                const fallbackFare = activeFares[0];
                
                if (!fallbackFare) {
                    throw new Error('No active fares found in the system');
                }
            }

            // Calculate stations in the same route
            const stationCount = await this.stationService.calculateStationCount(routeId, fromStation, toStation);
            
            // Calculate base price based on station count
            let baseStationPrice = baseFare.calculateStationBasedPrice(stationCount);
            
            // Apply trip type multiplier
            baseStationPrice = baseFare.calculatePriceForTrip(stationCount, tripType);
            
            // Get passenger multipliers from database
            const passengerMultipliers = await this.getPassengerMultipliers();

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
     * Calculate station count between two stations
     */
    async calculateStationCount(routeId, originStationId, destinationStationId) {
        return await this.stationService.calculateStationCount(routeId, originStationId, destinationStationId);
    }

    /**
     * Validate exit station for ticket
     */
    async validateExitStation(ticketId, exitStationId) {
        try {
            const { Ticket } = require('../../models/index.model');
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
            const fare = await this.fareRepository.findById(ticket.fareId);
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

    // These methods are not implemented in this calculator as they belong to other calculators
    async calculatePassBasedFare(routeId, passType, passengerType = 'adult') {
        throw new Error('Pass-based fare calculation not implemented in StationBasedFareCalculator');
    }

    async calculateMultiRouteFare(routeSegments, passengerType = 'adult') {
        throw new Error('Multi-route fare calculation not implemented in StationBasedFareCalculator');
    }
}

module.exports = StationBasedFareCalculator;
