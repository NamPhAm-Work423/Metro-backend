/**
 * Interface for Station Service operations
 * Following Interface Segregation Principle - separates station concerns from fare operations
 */
class IStationService {
    /**
     * Find routes that contain a specific station
     * @param {string} stationId - Station ID to search for
     * @returns {Promise<Array>} List of routes containing the station
     */
    async findRoutesContainingStation(stationId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get route stations
     * @param {string} routeId - Route ID
     * @returns {Promise<Array>} List of stations in the route
     */
    async getRouteStations(routeId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get all routes
     * @returns {Promise<Array>} List of all routes
     */
    async getAllRoutes() {
        throw new Error('Method not implemented');
    }

    /**
     * Get routes between two stations
     * @param {string} originStationId - Origin station ID
     * @param {string} destinationStationId - Destination station ID
     * @returns {Promise<Array>} List of routes between stations
     */
    async getRoutesByStations(originStationId, destinationStationId) {
        throw new Error('Method not implemented');
    }
}

module.exports = IStationService;
