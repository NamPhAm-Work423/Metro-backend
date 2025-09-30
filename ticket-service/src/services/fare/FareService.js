const { logger } = require('../../config/logger');
const IFareService = require('./interfaces/IFareService');
const IFareCalculator = require('./interfaces/IFareCalculator');
const IStationService = require('./interfaces/IStationService');

/**
 * Main Fare Service - Orchestrates fare operations using dependency injection
 * Following Dependency Inversion Principle - depends on abstractions, not concretions
 */
class FareService extends IFareService {
    constructor(fareRepository, stationService, fareCalculators) {
        super();
        this.fareRepository = fareRepository;
        this.stationService = stationService;
        this.fareCalculators = fareCalculators; // Object containing different calculator types
    }

    // CRUD Operations
    async createFare(fareData) {
        return await this.fareRepository.create(fareData);
    }

    async getAllFares(filters = {}) {
        return await this.fareRepository.findAll(filters);
    }

    async getFareById(fareId) {
        return await this.fareRepository.findById(fareId);
    }

    async updateFare(fareId, updateData) {
        return await this.fareRepository.update(fareId, updateData);
    }

    async deleteFare(fareId) {
        return await this.fareRepository.delete(fareId);
    }

    async getActiveFares() {
        return await this.fareRepository.findActiveFares();
    }

    async getFareStatistics(filters = {}) {
        return await this.fareRepository.getStatistics(filters);
    }

    async bulkUpdateFares(filters, updateData) {
        return await this.fareRepository.bulkUpdate(filters, updateData);
    }

    // Route-specific operations
    async getFaresByRoute(routeId, filters = {}) {
        return await this.fareRepository.findByRoute(routeId, filters);
    }

    async getFaresBetweenStations(originStationId, destinationStationId, filters = {}) {
        try {
            const where = {
                isActive: true
            };

            const fares = await this.fareRepository.findAll({
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

    async getFaresByZone(zones, filters = {}) {
        try {
            const where = {
                isActive: true
            };

            const fares = await this.fareRepository.findAll({
                where,
                order: [['basePrice', 'ASC']]
            });
            
            return fares;
        } catch (error) {
            logger.error('Error fetching fares by zone', { error: error.message, zones });
            throw error;
        }
    }

    // Fare calculation operations - delegate to appropriate calculators
    async calculateFarePrice(fareId) {
        try {
            const fare = await this.fareRepository.findById(fareId);
            
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

    // Station-based calculations
    async calculateStationCount(routeId, originStationId, destinationStationId) {
        return await this.stationService.calculateStationCount(routeId, originStationId, destinationStationId);
    }

    async calculateSinglePassengerFare(routeId, originStationId, destinationStationId, passengerType = 'adult', tripType = 'Oneway') {
        return await this.fareCalculators.stationBased.calculateSinglePassengerFare(
            routeId, originStationId, destinationStationId, passengerType, tripType
        );
    }

    async calculateStationBasedFare(fromStation, toStation, numAdults = 0, numElder = 0, numTeenager = 0, num = 0, tripType = 'Oneway') {
        return await this.fareCalculators.stationBased.calculateStationBasedFare(
            fromStation, toStation, numAdults, numElder, numTeenager, numChild, tripType
        );
    }

    // Pass-based calculations
    async calculatePassBasedFare(routeId, passType, passengerType = 'adult') {
        return await this.fareCalculators.passBased.calculatePassBasedFare(routeId, passType, passengerType);
    }

    // Multi-route calculations
    async calculateMultiRouteFare(routeSegments, passengerType = 'adult') {
        return await this.fareCalculators.multiRoute.calculateMultiRouteFare(routeSegments, passengerType);
    }

    /**
     * Calculate journey fare with route planning
     * @param {string} originStationId - Origin station ID
     * @param {string} destinationStationId - Destination station ID
     * @param {string} passengerType - Passenger type
     * @param {string} tripType - Trip type
     * @returns {Promise<Object>} Calculated fare with journey details
     */
    async calculateJourneyFare(originStationId, destinationStationId, passengerType = 'adult', tripType = 'Oneway') {
        return await this.fareCalculators.multiRoute.calculateJourneyFare(
            originStationId, destinationStationId, passengerType, tripType
        );
    }

    /**
     * Calculate fare for multiple passengers with journey planning
     * @param {string} originStationId - Origin station ID
     * @param {string} destinationStationId - Destination station ID
     * @param {Object} passengerCounts - Passenger counts
     * @param {string} tripType - Trip type
     * @returns {Promise<Object>} Calculated fare for multiple passengers
     */
    async calculateJourneyFareForMultiplePassengers(originStationId, destinationStationId, passengerCounts, tripType = 'Oneway') {
        try {
            // Use MultiRouteFareCalculator directly for journey planning and fare calculation
            return await this.fareCalculators.multiRoute.calculateJourneyFareForMultiplePassengers(
                originStationId,
                destinationStationId,
                passengerCounts,
                tripType
            );
        } catch (error) {
            logger.error('Error calculating journey fare for multiple passengers', {
                error: error.message,
                originStationId,
                destinationStationId,
                passengerCounts,
                tripType
            });
            throw error;
        }
    }

    // Validation operations
    async validateExitStation(ticketId, exitStationId) {
        return await this.fareCalculators.stationBased.validateExitStation(ticketId, exitStationId);
    }

    // Route operations
    async findRoutesContainingStation(stationId) {
        return await this.stationService.findRoutesContainingStation(stationId);
    }

    async getRouteFareDetails(routeId) {
        try {
            const fares = await this.fareRepository.findByRoute(routeId);

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

module.exports = FareService;
