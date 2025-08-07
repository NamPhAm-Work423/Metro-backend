const FareRepository = require('./repositories/FareRepository');
const StationService = require('./services/StationService');
const StationBasedFareCalculator = require('./calculators/StationBasedFareCalculator');
const PassBasedFareCalculator = require('./calculators/PassBasedFareCalculator');
const MultiRouteFareCalculator = require('./calculators/MultiRouteFareCalculator');
const FareService = require('./FareService');

/**
 * Factory for creating FareService with all dependencies properly injected
 * Following Dependency Inversion Principle - high-level modules don't depend on low-level modules
 */
class FareServiceFactory {
    /**
     * Create a fully configured FareService instance
     * @returns {FareService} Configured fare service
     */
    static createFareService() {
        // Create repositories
        const fareRepository = new FareRepository();
        
        // Create services
        const stationService = new StationService();
        
        // Create calculators
        const stationBasedCalculator = new StationBasedFareCalculator(fareRepository, stationService);
        const passBasedCalculator = new PassBasedFareCalculator(fareRepository);
        const multiRouteCalculator = new MultiRouteFareCalculator(stationBasedCalculator, stationService, fareRepository);
        
        // Group calculators
        const fareCalculators = {
            stationBased: stationBasedCalculator,
            passBased: passBasedCalculator,
            multiRoute: multiRouteCalculator
        };
        
        // Create and return the main service
        return new FareService(fareRepository, stationService, fareCalculators);
    }

    /**
     * Create individual components for testing or specific use cases
     */
    static createFareRepository() {
        return new FareRepository();
    }

    static createStationService() {
        return new StationService();
    }

    static createStationBasedCalculator(fareRepository, stationService) {
        return new StationBasedFareCalculator(fareRepository, stationService);
    }

    static createPassBasedCalculator(fareRepository) {
        return new PassBasedFareCalculator(fareRepository);
    }

    static createMultiRouteCalculator(stationBasedCalculator) {
        return new MultiRouteFareCalculator(stationBasedCalculator);
    }
}

module.exports = FareServiceFactory;
