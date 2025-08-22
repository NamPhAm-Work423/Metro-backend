const fareService = require('../services/fare.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const { logger } = require('../config/logger');

class FareController {
    // POST /v1/fares
    createFare = asyncErrorHandler(async (req, res, next) => {
        try {
            const fareData = req.body;
            const fare = await fareService.createFare(fareData);

            res.status(201).json({
            success: true,
                message: 'Fare created successfully',
                data: fare
            });
        } catch (error) {
            logger.error('Error creating fare', { error: error.message });
            next(error);
        }
    });

    // GET /v1/fares
    getAllFares = asyncErrorHandler(async (req, res, next) => {
        try {
            const filters = req.query;
            const fares = await fareService.getAllFares(filters);
        
            res.status(200).json({
                success: true,
                message: 'Fares retrieved successfully',
                data: fares,
                    count: fares.length
            });
        } catch (error) {
            logger.error('Error getting all fares', { error: error.message });
            next(error);
        }
    });

    // GET /v1/fares/getAllActiveFares
    getAllActiveFares = asyncErrorHandler(async (req, res, next) => {
        try {
            const fares = await fareService.getAllActiveFares();
            res.status(200).json({
                success: true,
                message: 'Active fares retrieved successfully',
                data: fares,
                count: fares.length
            });
        } catch (error) {
            logger.error('Error getting all active fares', { error: error.message });
            next(error);
        }
    });

    // GET /v1/fares/:id
    getFareById = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const fare = await fareService.getFareById(id);
        
            if (!fare) {
                return res.status(404).json({
                    success: false,
                    message: 'Fare not found'
                });
            }
            
            res.status(200).json({
                success: true,
                message: 'Fare retrieved successfully',
                    data: fare
            });
        } catch (error) {
            logger.error('Error getting fare by id', { error: error.message });
            next(error);
        }
    });

    // PUT /v1/fares/:id
    updateFare = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            const fare = await fareService.updateFare(id, updateData);
            
            if (!fare) {
                return res.status(404).json({
                    success: false,
                    message: 'Fare not found'
                });
            }
            
            res.status(200).json({
                success: true,
                message: 'Fare updated successfully',
                data: fare
            });
        } catch (error) {
            logger.error('Error updating fare', { error: error.message });
            next(error);
        }
    });

    // DELETE /v1/fares/:id
    deleteFare = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await fareService.deleteFare(id);
            
            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            logger.error('Error deleting fare', { error: error.message });
            next(error);
        }
    });

    // GET /v1/fares/route/:routeId
    getFaresByRoute = asyncErrorHandler(async (req, res, next) => {
        try {
            const { routeId } = req.params;
            const filters = req.query;
            const fares = await fareService.getFaresByRoute(routeId, filters);
            
            res.status(200).json({
                success: true,
                message: 'Route fares retrieved successfully',
                data: fares,
                count: fares.length
            });
        } catch (error) {
            logger.error('Error getting fares by route', { error: error.message });
            next(error);
        }
    });

    // GET /v1/fares/stations/:originId/:destinationId
    getFaresBetweenStations = asyncErrorHandler(async (req, res, next) => {
        try {
            const { originId, destinationId } = req.params;
            const filters = req.query;
            const fares = await fareService.getFaresBetweenStations(originId, destinationId, filters);
            
            res.status(200).json({
                success: true,
                message: 'Station-to-station fares retrieved successfully',
                data: fares,
                count: fares.length
            });
        } catch (error) {
            logger.error('Error getting fares between stations', { error: error.message });
            next(error);
        }
    });

    // GET /v1/fares/:id/calculate
    calculateFarePrice = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const options = req.query;
            
            // Convert string to boolean for isPeakHour
            if (options.isPeakHour) {
                options.isPeakHour = options.isPeakHour === 'true';
            }
            
            const priceCalculation = await fareService.calculateFarePrice(id, options);
            
            res.status(200).json({
                success: true,
                message: 'Fare price calculated successfully',
                data: priceCalculation
            });
        } catch (error) {
            logger.error('Error calculating fare price', { error: error.message });
            next(error);
        }
    });

    // GET /v1/fares/active
    getActiveFares = asyncErrorHandler(async (req, res, next) => {
        try {
            const fares = await fareService.getActiveFares();
            
            res.status(200).json({
                success: true,
                message: 'Active fares retrieved successfully',
                data: fares,
                count: fares.length
            });
        } catch (error) {
            logger.error('Error getting active fares', { error: error.message });
            next(error);
        }
    });

    // GET /v1/fares/zones/:zones
    getFaresByZone = asyncErrorHandler(async (req, res, next) => {
        try {
            const { zones } = req.params;
            const filters = req.query;
            const fares = await fareService.getFaresByZone(parseInt(zones), filters);
            
            res.status(200).json({
                success: true,
                message: 'Zone-based fares retrieved successfully',
                data: fares,
                count: fares.length
            });
        } catch (error) {
            logger.error('Error getting fares by zone', { error: error.message });
            next(error);
        }
    });

    // GET /v1/fares/statistics
    getFareStatistics = asyncErrorHandler(async (req, res, next) => {
        try {
            const filters = req.query;
            const stats = await fareService.getFareStatistics(filters);
            
            res.status(200).json({
                success: true,
                message: 'Fare statistics retrieved successfully',
                data: stats
            });
        } catch (error) {
            logger.error('Error getting fare statistics', { error: error.message });
            next(error);
        }
    });

    // PUT /v1/fares/bulk-update
    bulkUpdateFares = asyncErrorHandler(async (req, res, next) => {
        try {
            const { filters, updateData } = req.body;
            
            if (!filters || !updateData) {
                return res.status(400).json({
                    success: false,
                    message: 'Both filters and updateData are required'
                });
            }
            
            const result = await fareService.bulkUpdateFares(filters, updateData);
            
            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    updatedCount: result.updatedCount,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            logger.error('Error bulk updating fares', { error: error.message });
            next(error);
        }
    });

    // GET /v1/fares/search
    searchFares = asyncErrorHandler(async (req, res, next) => {
        try {
            const { 
                originStationId, 
                destinationStationId, 
                ticketType, 
                passengerType, 
                isPeakHour,
                effectiveDate 
            } = req.query;
            
            if (!originStationId || !destinationStationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Origin and destination station IDs are required'
                });
            }
            
            const filters = {
                ticketType,
                passengerType,
                effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date()
            };
            
            const fares = await fareService.getFaresBetweenStations(
                originStationId, 
                destinationStationId, 
                filters
            );
            
            // Calculate prices if isPeakHour is specified
            if (isPeakHour !== undefined) {
                const isPeak = isPeakHour === 'true';
                const faresWithPrices = await Promise.all(
                    fares.map(async (fare) => {
                        const priceCalc = await fareService.calculateFarePrice(fare.fareId, { isPeakHour: isPeak });
                        return {
                            ...fare.toJSON(),
                            calculatedPrice: priceCalc.finalPrice,
                            isPeakHour: isPeak
                        };
                    })
                );
                
                return res.status(200).json({
                    success: true,
                    message: 'Fares searched and calculated successfully',
                    data: faresWithPrices,
                    count: faresWithPrices.length
                });
            }
            
            res.status(200).json({
                success: true,
                message: 'Fares searched successfully',
                data: fares,
                count: fares.length
            });
        } catch (error) {
            logger.error('Error searching fares', { error: error.message });
            next(error);
        }
    });

    // GET /v1/fares/health
    healthCheck = asyncErrorHandler(async (req, res, next) => {
        res.status(200).json({
            success: true,
            message: 'Fare service is healthy',
            timestamp: new Date(),
            service: 'fare-controller'
        });
    });
}

module.exports = new FareController();
