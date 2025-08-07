const { logger } = require('../../../config/logger');
const IFareCalculator = require('../interfaces/IFareCalculator');

/**
 * Pass-Based Fare Calculator - Single Responsibility: Calculate fares for pass-based tickets
 * Following Single Responsibility Principle - only handles pass-based fare calculations
 */
class PassBasedFareCalculator extends IFareCalculator {
    constructor(fareRepository) {
        super();
        this.fareRepository = fareRepository;
    }

    /**
     * Calculate fare for pass-based tickets (day/week/month/year/lifetime)
     */
    async calculatePassBasedFare(routeId, passType, passengerType = 'adult') {
        try {
            // Get base fare for the route
            const fare = await this.fareRepository.findOneByRouteAndType(
                routeId, 
                passType, 
                passengerType
            );

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
     */
    async calculateSinglePassengerFare(routeId, originStationId, destinationStationId, passengerType = 'adult', tripType = 'Oneway') {
        throw new Error('Single passenger fare calculation not implemented in PassBasedFareCalculator');
    }

    /**
     * Calculate fare for multiple passengers
     */
    async calculateStationBasedFare(fromStation, toStation, numAdults = 0, numElder = 0, numTeenager = 0, numChild = 0, tripType = 'Oneway') {
        throw new Error('Station-based fare calculation not implemented in PassBasedFareCalculator');
    }

    /**
     * Calculate fare for multi-route journey
     */
    async calculateMultiRouteFare(routeSegments, passengerType = 'adult') {
        throw new Error('Multi-route fare calculation not implemented in PassBasedFareCalculator');
    }

    /**
     * Calculate station count between two stations
     */
    async calculateStationCount(routeId, originStationId, destinationStationId) {
        throw new Error('Station count calculation not implemented in PassBasedFareCalculator');
    }

    /**
     * Validate exit station for ticket
     */
    async validateExitStation(ticketId, exitStationId) {
        throw new Error('Exit station validation not implemented in PassBasedFareCalculator');
    }
}

module.exports = PassBasedFareCalculator;
