const { logger } = require('../config/logger');
const { callTransport } = require('../grpc/publicClient');

class TransportGrpcService {
    constructor() {
        logger.info('TransportGrpcService initialized - using publicClient');
    }

    /**
     * Fetch all transport data via gRPC
     */
    async fetchAllTransportData() {
        try {
            logger.info('Fetching all transport data via gRPC');
            
            // First get all routes
            const routesResponse = await callTransport('ListRoutes', {});
            const routes = routesResponse.routes || [];
            
            // Then get route stations for each route
            const routeStationsPromises = routes.map(route => 
                callTransport('GetRouteStations', { routeId: route.routeId })
            );
            
            const routeStationsResponses = await Promise.all(routeStationsPromises);
            const allRouteStations = routeStationsResponses.flatMap(response => response.routeStations || []);
            
            return {
                routes: routes,
                routeStations: allRouteStations
            };
        } catch (error) {
            logger.error('Failed to fetch transport data via gRPC', { error: error.message });
            throw new Error(`Failed to fetch transport data: ${error.message}`);
        }
    }

    /**
     * Fetch all routes via gRPC
     */
    async fetchAllRoutes() {
        try {
            logger.info('Fetching all routes via gRPC');
            
            const response = await callTransport('ListRoutes', {});
            return response.routes || [];
        } catch (error) {
            logger.error('Failed to fetch routes via gRPC', { error: error.message });
            throw new Error(`Failed to fetch routes: ${error.message}`);
        }
    }

    /**
     * Fetch route stations for a specific route via gRPC
     */
    async fetchRouteStations(routeId) {
        try {
            logger.info('Fetching route stations via gRPC', { routeId });
            
            const response = await callTransport('GetRouteStations', { routeId });
            return response.routeStations || [];
        } catch (error) {
            logger.error('Failed to fetch route stations via gRPC', { error: error.message, routeId });
            throw new Error(`Failed to fetch route stations: ${error.message}`);
        }
    }

    /**
     * Fetch all route stations via gRPC
     */
    async fetchAllRouteStations() {
        try {
            logger.info('Fetching all route stations via gRPC');
            
            // First get all routes
            const routes = await this.fetchAllRoutes();
            
            // Then get route stations for each route
            const routeStationsPromises = routes.map(route => 
                this.fetchRouteStations(route.routeId)
            );
            
            const routeStationsResponses = await Promise.all(routeStationsPromises);
            return routeStationsResponses.flat();
        } catch (error) {
            logger.error('Failed to fetch route stations via gRPC', { error: error.message });
            throw new Error(`Failed to fetch route stations: ${error.message}`);
        }
    }

    /**
     * Get routes by origin and destination stations
     */
    async getRoutesByStations(originStationId, destinationStationId) {
        try {
            logger.info('Getting routes by stations via gRPC', { originStationId, destinationStationId });
            
            const response = await callTransport('GetRoutesByStations', {
                originStationId,
                destinationStationId
            });
            return response.routes || [];
        } catch (error) {
            logger.error('Failed to get routes by stations via gRPC', { error: error.message });
            throw new Error(`Failed to get routes by stations: ${error.message}`);
        }
    }

    /**
     * Get single route by ID
     */
    async getRoute(routeId) {
        try {
            logger.info('Getting route via gRPC', { routeId });
            
            const response = await callTransport('GetRoute', { routeId });
            return response;
        } catch (error) {
            logger.error('Failed to get route via gRPC', { error: error.message, routeId });
            throw new Error(`Failed to get route: ${error.message}`);
        }
    }

    /**
     * Get station by ID
     */
    async getStation(stationId) {
        try {
            logger.info('Getting station via gRPC', { stationId });
            
            const response = await callTransport('GetStation', { stationId });
            return response;
        } catch (error) {
            logger.error('Failed to get station via gRPC', { error: error.message, stationId });
            throw new Error(`Failed to get station: ${error.message}`);
        }
    }

    /**
     * Calculate station count between origin and destination
     */
    async calculateStationCount(routeId, originStationId, destinationStationId) {
        try {
            logger.info('Calculating station count via gRPC', { routeId, originStationId, destinationStationId });
            
            const response = await callTransport('CalculateStationCount', {
                routeId,
                originStationId,
                destinationStationId
            });
            return response;
        } catch (error) {
            logger.error('Failed to calculate station count via gRPC', { error: error.message });
            throw new Error(`Failed to calculate station count: ${error.message}`);
        }
    }

    /**
     * Fetch trips for the next N days (default 7) via gRPC
     */
    async fetchTripsNextDays({ startDate, days = 7, routeId } = {}) {
        try {
            const req = { startDate: startDate || '', days, routeId: routeId || '' };
            logger.info('Fetching trips for next days via gRPC', req);
            const response = await callTransport('ListTripsNext7Days', req);
            return response?.items || [];
        } catch (error) {
            logger.error('Failed to fetch trips next days via gRPC', { error: error.message });
            throw new Error(`Failed to fetch trips next days: ${error.message}`);
        }
    }
}

module.exports = TransportGrpcService; 