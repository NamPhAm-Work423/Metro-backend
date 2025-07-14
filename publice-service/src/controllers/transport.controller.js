const { logger } = require('../config/logger');
const CacheService = require('../services/cache.service');

class TransportController {
    constructor() {
        this.cacheService = new CacheService();
    }

    /**
     * Get all cached routes
     * GET /v1/routes
     */
    async getAllRoutes(req, res) {
        try {
            logger.info('Request for all routes', { 
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const routes = await this.cacheService.getRoutes();

            if (!routes) {
                return res.status(404).json({
                    success: false,
                    message: 'Routes data not found in cache',
                    error: 'Cache miss - data may not have been fetched yet'
                });
            }

            res.json({
                success: true,
                data: routes,
                count: Array.isArray(routes) ? routes.length : 0,
                cached: true,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error fetching routes', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching routes',
                error: error.message
            });
        }
    }

    /**
     * Get specific route by ID
     * GET /v1/routes/:id
     */
    async getRouteById(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Route ID is required'
                });
            }

            logger.info('Request for route by ID', { 
                routeId: id,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const route = await this.cacheService.getRouteById(id);

            if (!route) {
                return res.status(404).json({
                    success: false,
                    message: `Route with ID ${id} not found`,
                    routeId: id
                });
            }

            res.json({
                success: true,
                data: route,
                routeId: id,
                cached: true,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error fetching route by ID', { 
                routeId: req.params.id,
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching route',
                error: error.message,
                routeId: req.params.id
            });
        }
    }

    /**
     * Get all cached stations
     * GET /v1/stations
     */
    async getAllStations(req, res) {
        try {
            logger.info('Request for all stations', { 
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const stations = await this.cacheService.getStations();

            if (!stations) {
                return res.status(404).json({
                    success: false,
                    message: 'Stations data not found in cache',
                    error: 'Cache miss - data may not have been fetched yet'
                });
            }

            res.json({
                success: true,
                data: stations,
                count: Array.isArray(stations) ? stations.length : 0,
                cached: true,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error fetching stations', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching stations',
                error: error.message
            });
        }
    }

    /**
     * Get specific station by ID
     * GET /v1/stations/:id
     */
    async getStationById(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Station ID is required'
                });
            }

            logger.info('Request for station by ID', { 
                stationId: id,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const station = await this.cacheService.getStationById(id);

            if (!station) {
                return res.status(404).json({
                    success: false,
                    message: `Station with ID ${id} not found`,
                    stationId: id
                });
            }

            res.json({
                success: true,
                data: station,
                stationId: id,
                cached: true,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error fetching station by ID', { 
                stationId: req.params.id,
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching station',
                error: error.message,
                stationId: req.params.id
            });
        }
    }

    /**
     * Get stations for a specific route
     * GET /v1/routes/:routeId/stations
     */
    async getRouteStations(req, res) {
        try {
            const { routeId } = req.params;

            if (!routeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Route ID is required'
                });
            }

            logger.info('Request for route stations', { 
                routeId,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const stations = await this.cacheService.getRouteStations(routeId);

            if (!stations) {
                return res.status(404).json({
                    success: false,
                    message: `Stations for route ${routeId} not found`,
                    routeId
                });
            }

            res.json({
                success: true,
                data: stations,
                count: Array.isArray(stations) ? stations.length : 0,
                routeId,
                cached: true,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error fetching route stations', { 
                routeId: req.params.routeId,
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching route stations',
                error: error.message,
                routeId: req.params.routeId
            });
        }
    }

    /**
     * Search routes by origin and destination stations
     * GET /v1/routes/search?origin=stationId&destination=stationId
     */
    async searchRoutes(req, res) {
        try {
            const { origin, destination } = req.query;

            if (!origin || !destination) {
                return res.status(400).json({
                    success: false,
                    message: 'Both origin and destination station IDs are required',
                    required: ['origin', 'destination']
                });
            }

            logger.info('Request for route search', { 
                origin,
                destination,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            // Get all routes and filter by origin/destination
            const allRoutes = await this.cacheService.getRoutes();

            if (!allRoutes) {
                return res.status(404).json({
                    success: false,
                    message: 'Routes data not available in cache'
                });
            }

            // Filter routes that connect the specified stations
            const matchingRoutes = Array.isArray(allRoutes) 
                ? allRoutes.filter(route => 
                    (route.originId === origin && route.destinationId === destination) ||
                    (route.originId === destination && route.destinationId === origin)
                  )
                : [];

            res.json({
                success: true,
                data: matchingRoutes,
                count: matchingRoutes.length,
                search: { origin, destination },
                cached: true,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error searching routes', { 
                origin: req.query.origin,
                destination: req.query.destination,
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while searching routes',
                error: error.message
            });
        }
    }
}

module.exports = TransportController; 