const { logger } = require('../config/logger');
const CacheService = require('../services/cache.service');

class TicketController {
    constructor() {
        this.cacheService = new CacheService();
    }

    /**
     * Get all cached fares
     * GET /v1/fares
     */
    async getAllFares(req, res) {
        try {
            logger.info('Request for all fares', { 
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const fares = await this.cacheService.getFares();

            if (!fares) {
                return res.status(404).json({
                    success: false,
                    message: 'Fares data not found in cache',
                    error: 'Cache miss - data may not have been fetched yet'
                });
            }

            res.json({
                success: true,
                data: fares,
                count: Array.isArray(fares) ? fares.length : 0,
                cached: true,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error fetching fares', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching fares',
                error: error.message
            });
        }
    }

    /**
     * Get fares for a specific route
     * GET /v1/fares/route/:routeId
     */
    async getFaresByRoute(req, res) {
        try {
            const { routeId } = req.params;

            if (!routeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Route ID is required'
                });
            }

            logger.info('Request for fares by route', { 
                routeId,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const fares = await this.cacheService.getFaresByRoute(routeId);

            if (!fares) {
                return res.status(404).json({
                    success: false,
                    message: `Fares for route ${routeId} not found`,
                    routeId
                });
            }

            res.json({
                success: true,
                data: fares,
                count: Array.isArray(fares) ? fares.length : 0,
                routeId,
                cached: true,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error fetching fares by route', { 
                routeId: req.params.routeId,
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching fares by route',
                error: error.message,
                routeId: req.params.routeId
            });
        }
    }

    /**
     * Get all cached transit passes
     * GET /v1/transit-passes
     */
    async getAllTransitPasses(req, res) {
        try {
            logger.info('Request for all transit passes', { 
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const transitPasses = await this.cacheService.getTransitPasses();

            if (!transitPasses) {
                return res.status(404).json({
                    success: false,
                    message: 'Transit passes data not found in cache',
                    error: 'Cache miss - data may not have been fetched yet'
                });
            }

            res.json({
                success: true,
                data: transitPasses,
                count: Array.isArray(transitPasses) ? transitPasses.length : 0,
                cached: true,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error fetching transit passes', { 
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching transit passes',
                error: error.message
            });
        }
    }

    /**
     * Get specific transit pass by type
     * GET /v1/transit-passes/:type
     */
    async getTransitPassByType(req, res) {
        try {
            const { type } = req.params;

            if (!type) {
                return res.status(400).json({
                    success: false,
                    message: 'Transit pass type is required'
                });
            }

            const validTypes = ['day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transit pass type',
                    validTypes,
                    provided: type
                });
            }

            logger.info('Request for transit pass by type', { 
                type,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const transitPass = await this.cacheService.getTransitPassByType(type);

            if (!transitPass) {
                return res.status(404).json({
                    success: false,
                    message: `Transit pass type ${type} not found`,
                    type
                });
            }

            res.json({
                success: true,
                data: transitPass,
                type,
                cached: true,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error fetching transit pass by type', { 
                type: req.params.type,
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching transit pass',
                error: error.message,
                type: req.params.type
            });
        }
    }

    /**
     * Search fares by criteria
     * GET /v1/fares/search?routeId=xxx&currency=VND&isActive=true
     */
    async searchFares(req, res) {
        try {
            const { routeId, currency, isActive, minPrice, maxPrice } = req.query;

            logger.info('Request for fare search', { 
                query: req.query,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            // Get all fares and filter by criteria
            const allFares = await this.cacheService.getFares();

            if (!allFares) {
                return res.status(404).json({
                    success: false,
                    message: 'Fares data not available in cache'
                });
            }

            let filteredFares = Array.isArray(allFares) ? [...allFares] : [];

            // Apply filters
            if (routeId) {
                filteredFares = filteredFares.filter(fare => fare.routeId === routeId);
            }

            if (currency) {
                filteredFares = filteredFares.filter(fare => fare.currency === currency.toUpperCase());
            }

            if (isActive !== undefined) {
                const activeFilter = isActive === 'true';
                filteredFares = filteredFares.filter(fare => fare.isActive === activeFilter);
            }

            if (minPrice !== undefined) {
                const min = parseFloat(minPrice);
                if (!isNaN(min)) {
                    filteredFares = filteredFares.filter(fare => parseFloat(fare.basePrice) >= min);
                }
            }

            if (maxPrice !== undefined) {
                const max = parseFloat(maxPrice);
                if (!isNaN(max)) {
                    filteredFares = filteredFares.filter(fare => parseFloat(fare.basePrice) <= max);
                }
            }

            res.json({
                success: true,
                data: filteredFares,
                count: filteredFares.length,
                filters: { routeId, currency, isActive, minPrice, maxPrice },
                cached: true,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error searching fares', { 
                query: req.query,
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while searching fares',
                error: error.message
            });
        }
    }

    /**
     * Get fare calculation example for a route
     * GET /v1/fares/route/:routeId/calculate?stations=5&tripType=oneway
     */
    async calculateFareExample(req, res) {
        try {
            const { routeId } = req.params;
            const { stations = 1, tripType = 'oneway' } = req.query;

            if (!routeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Route ID is required'
                });
            }

            const stationCount = parseInt(stations);
            if (isNaN(stationCount) || stationCount < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Stations must be a positive number',
                    provided: stations
                });
            }

            const validTripTypes = ['oneway', 'return'];
            if (!validTripTypes.includes(tripType.toLowerCase())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid trip type',
                    validTypes: validTripTypes,
                    provided: tripType
                });
            }

            logger.info('Request for fare calculation', { 
                routeId,
                stations: stationCount,
                tripType,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const routeFares = await this.cacheService.getFaresByRoute(routeId);

            if (!routeFares || !Array.isArray(routeFares) || routeFares.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `No fares found for route ${routeId}`,
                    routeId
                });
            }

            // Use the first fare for calculation example
            const baseFare = routeFares[0];
            const basePrice = parseFloat(baseFare.basePrice);

            // Calculate station-based price
            let calculatedPrice = basePrice;
            
            if (stationCount <= 5) {
                calculatedPrice = basePrice;
            } else if (stationCount <= 10) {
                calculatedPrice = basePrice * 1.2;
            } else if (stationCount <= 15) {
                calculatedPrice = basePrice * 1.4;
            } else if (stationCount <= 20) {
                calculatedPrice = basePrice * 1.6;
            } else if (stationCount <= 25) {
                calculatedPrice = basePrice * 1.8;
            } else {
                calculatedPrice = basePrice * 2.0;
            }

            // Apply trip type multiplier
            if (tripType.toLowerCase() === 'return') {
                calculatedPrice = calculatedPrice * 1.5;
            }

            const calculation = {
                routeId,
                basePrice,
                stationCount,
                tripType: tripType.toLowerCase(),
                calculatedPrice: Math.round(calculatedPrice * 100) / 100,
                currency: baseFare.currency,
                multiplier: calculatedPrice / basePrice,
                breakdown: {
                    basePrice,
                    stationMultiplier: calculatedPrice / (tripType.toLowerCase() === 'return' ? 1.5 : 1) / basePrice,
                    tripMultiplier: tripType.toLowerCase() === 'return' ? 1.5 : 1,
                    finalPrice: calculatedPrice
                }
            };

            res.json({
                success: true,
                data: calculation,
                baseFare,
                cached: true,
                note: 'This is a calculation example based on cached fare data',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error calculating fare example', { 
                routeId: req.params.routeId,
                query: req.query,
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                success: false,
                message: 'Internal server error while calculating fare',
                error: error.message
            });
        }
    }
}

module.exports = TicketController; 