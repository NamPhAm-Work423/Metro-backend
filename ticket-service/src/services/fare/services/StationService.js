const TransportClient = require('../../../grpc/transportClient');
const { logger } = require('../../../config/logger');
const IStationService = require('../interfaces/IStationService');

/**
 * Station Service - Single Responsibility: Handle station-related operations
 * Following Single Responsibility Principle - only handles station operations
 */
class StationService extends IStationService {
    async findRoutesContainingStation(stationId) {
        try {
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

    async getRouteStations(routeId) {
        try {
            const response = await TransportClient.getRouteStations(routeId);
            return response && response.routeStations ? response.routeStations : [];
        } catch (error) {
            logger.error('Error getting route stations', {
                error: error.message,
                routeId
            });
            throw error;
        }
    }

    async getAllRoutes() {
        try {
            const response = await TransportClient.getAllRoutes();
            return response && response.routes ? response.routes : [];
        } catch (error) {
            logger.error('Error getting all routes', {
                error: error.message
            });
            throw error;
        }
    }

    async getRoutesByStations(originStationId, destinationStationId) {
        try {
            const response = await TransportClient.getRoutesByStations(originStationId, destinationStationId);
            return response;
        } catch (error) {
            logger.error('Error getting routes by stations', {
                error: error.message,
                originStationId,
                destinationStationId
            });
            throw error;
        }
    }

    /**
     * Calculate station count between two stations on a route
     * @param {string} routeId - Route ID
     * @param {string} originStationId - Origin station ID
     * @param {string} destinationStationId - Destination station ID
     * @returns {Promise<number>} Number of stations
     */
    async calculateStationCount(routeId, originStationId, destinationStationId) {
        try {
            // First, try to get routes between the two stations to find the route
            let actualRouteId = routeId;
            
            // If routeId is the default mock value, find the actual route
            if (routeId === 'default-route-001') {
                try {
                    const routesResponse = await this.getRoutesByStations(originStationId, destinationStationId);
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
                    // Fallback: return a reasonable station count estimate
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
                const routeStations = await this.getRouteStations(actualRouteId);
                
                if (routeStations && routeStations.length > 0) {
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
}

module.exports = StationService;
