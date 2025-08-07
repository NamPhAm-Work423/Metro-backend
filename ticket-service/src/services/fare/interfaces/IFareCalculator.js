/**
 * Interface for Fare Calculation operations
 * Following Interface Segregation Principle - separates calculation concerns from CRUD operations
 */
class IFareCalculator {
    /**
     * Calculate fare for single passenger
     * @param {string} routeId - Route ID
     * @param {string} originStationId - Origin station ID
     * @param {string} destinationStationId - Destination station ID
     * @param {string} passengerType - Passenger type
     * @param {string} tripType - Trip type (Oneway/Return)
     * @returns {Promise<Object>} Calculated fare
     */
    async calculateSinglePassengerFare(routeId, originStationId, destinationStationId, passengerType = 'adult', tripType = 'Oneway') {
        throw new Error('Method not implemented');
    }

    /**
     * Calculate fare for multiple passengers
     * @param {string} fromStation - Origin station ID
     * @param {string} toStation - Destination station ID
     * @param {number} numAdults - Number of adults
     * @param {number} numElder - Number of elderly
     * @param {number} numTeenager - Number of teenagers
     * @param {number} numChild - Number of children
     * @param {string} tripType - Trip type
     * @returns {Promise<Object>} Calculated fare
     */
    async calculateStationBasedFare(fromStation, toStation, numAdults = 0, numElder = 0, numTeenager = 0, numChild = 0, tripType = 'Oneway') {
        throw new Error('Method not implemented');
    }

    /**
     * Calculate fare for pass-based tickets
     * @param {string} routeId - Route ID
     * @param {string} passType - Pass type
     * @param {string} passengerType - Passenger type
     * @returns {Promise<Object>} Calculated fare
     */
    async calculatePassBasedFare(routeId, passType, passengerType = 'adult') {
        throw new Error('Method not implemented');
    }

    /**
     * Calculate fare for multi-route journey
     * @param {Array} routeSegments - Route segments
     * @param {string} passengerType - Passenger type
     * @returns {Promise<Object>} Calculated fare
     */
    async calculateMultiRouteFare(routeSegments, passengerType = 'adult') {
        throw new Error('Method not implemented');
    }

    /**
     * Calculate station count between two stations
     * @param {string} routeId - Route ID
     * @param {string} originStationId - Origin station ID
     * @param {string} destinationStationId - Destination station ID
     * @returns {Promise<number>} Station count
     */
    async calculateStationCount(routeId, originStationId, destinationStationId) {
        throw new Error('Method not implemented');
    }

    /**
     * Validate exit station for ticket
     * @param {string} ticketId - Ticket ID
     * @param {string} exitStationId - Exit station ID
     * @returns {Promise<Object>} Validation result
     */
    async validateExitStation(ticketId, exitStationId) {
        throw new Error('Method not implemented');
    }
}

module.exports = IFareCalculator;
