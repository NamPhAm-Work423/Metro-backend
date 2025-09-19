const fareService = require('../services/fare.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const { logger } = require('../config/logger');
const { addCustomSpan } = require('../tracing');

class FareController {
    // POST /v1/fares
    createFare = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('fare.create', async (span) => {
            const fareData = req.body;
            
            span.setAttributes({
                'operation.type': 'create',
                'operation.entity': 'fare',
                'fare.type': fareData.fareType || 'unknown',
                'fare.start_station': fareData.startStationId,
                'fare.end_station': fareData.endStationId,
                'fare.price': fareData.price || 0,
                'request.authenticated': !!req.user,
                'user.id': req.user?.id || 'unknown'
            });

            try {
                logger.traceInfo('Creating fare', {
                    fareData: {
                        fareType: fareData.fareType,
                        startStationId: fareData.startStationId,
                        endStationId: fareData.endStationId,
                        price: fareData.price
                    },
                    requestedBy: req.user?.id
                });

                const fare = await addCustomSpan('fare.service.create', async (serviceSpan) => {
                    serviceSpan.setAttributes({
                        'service.operation': 'create_fare',
                        'fare.type': fareData.fareType,
                        'fare.price': fareData.price
                    });
                    
                    const result = await fareService.createFare(fareData);
                    
                    serviceSpan.setAttributes({
                        'service.success': !!result,
                        'fare.created_id': result?.fareId || 'unknown'
                    });
                    
                    return result;
                });

                span.setAttributes({
                    'operation.success': true,
                    'fare.created_id': fare.fareId,
                    'http.status_code': 201
                });

                logger.traceInfo('Fare created successfully', {
                    fareId: fare.fareId,
                    fareType: fare.fareType,
                    price: fare.price
                });

                return res.status(201).json({
                success: true,
                    message: 'Fare created successfully',
                    data: fare
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({
                    'operation.success': false,
                    'error.type': error.constructor.name,
                    'error.message': error.message,
                    'http.status_code': 400
                });

                logger.traceError('Failed to create fare', error, {
                    fareData,
                    requestedBy: req.user?.id
                });

                return res.status(400).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_CREATE_FARE'
                });
            }
        });
    });

    // GET /v1/fares
    getAllFares = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('fare.get-all', async (span) => {
            span.setAttributes({
                'operation.type': 'read',
                'operation.entity': 'fare',
                'operation.scope': 'all',
                'query.has_filters': Object.keys(req.query || {}).length > 0,
                'request.authenticated': !!req.user,
                'user.id': req.user?.id || 'unknown'
            });

            try {
                const filters = req.query;
                
                logger.traceInfo('Fetching all fares', {
                    filters,
                    requestedBy: req.user?.id
                });

                const fares = await addCustomSpan('fare.service.get-all', async (serviceSpan) => {
                    serviceSpan.setAttributes({
                        'service.operation': 'get_all_fares',
                        'query.filters': JSON.stringify(filters || {})
                    });
                    
                    const result = await fareService.getAllFares(filters);
                    
                    serviceSpan.setAttributes({
                        'service.success': true,
                        'fares.count': result.length,
                        'fares.found': result.length > 0
                    });
                    
                    return result;
                });

                span.setAttributes({
                    'operation.success': true,
                    'response.fares_count': fares.length,
                    'http.status_code': 200
                });

                logger.traceInfo('Fares retrieved successfully', {
                    faresCount: fares.length,
                    filters
                });
            
                return res.status(200).json({
                    success: true,
                    message: 'Fares retrieved successfully',
                    data: fares,
                        count: fares.length
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({
                    'operation.success': false,
                    'error.type': error.constructor.name,
                    'error.message': error.message,
                    'http.status_code': 500
                });

                logger.traceError('Failed to retrieve fares', error, {
                    filters: req.query,
                    requestedBy: req.user?.id
                });

                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_GET_ALL_FARES'
                });
            }
        });
    });

    // GET /v1/fares/getAllActiveFares
    getAllActiveFares = asyncErrorHandler(async (req, res, next) => {
        try {
            const fares = await fareService.getAllActiveFares();
            return res.status(200).json({
                success: true,
                message: 'Active fares retrieved successfully',
                data: fares,
                count: fares.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ALL_ACTIVE_FARES'
            });
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
            
            return res.status(200).json({
                success: true,
                message: 'Fare retrieved successfully',
                    data: fare
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_FARE_BY_ID'
            });
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
            
            return res.status(200).json({
                success: true,
                message: 'Fare updated successfully',
                data: fare
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_UPDATE_FARE'
            });
        }
    });

    // DELETE /v1/fares/:id
    deleteFare = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await fareService.deleteFare(id);
            
            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_DELETE_FARE'
            });
        }
    });

    // GET /v1/fares/route/:routeId
    getFaresByRoute = asyncErrorHandler(async (req, res, next) => {
        try {
            const { routeId } = req.params;
            const filters = req.query;
            const fares = await fareService.getFaresByRoute(routeId, filters);
            
            return res.status(200).json({
                success: true,
                message: 'Route fares retrieved successfully',
                data: fares,
                count: fares.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_FARES_BY_ROUTE'
            });
        }
    });

    // GET /v1/fares/stations/:originId/:destinationId
    getFaresBetweenStations = asyncErrorHandler(async (req, res, next) => {
        try {
            const { originId, destinationId } = req.params;
            const filters = req.query;
            const fares = await fareService.getFaresBetweenStations(originId, destinationId, filters);
            
            return res.status(200).json({
                success: true,
                message: 'Station-to-station fares retrieved successfully',
                data: fares,
                count: fares.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_FARES_BETWEEN_STATIONS'
            });
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
            
            return res.status(200).json({
                success: true,
                message: 'Fare price calculated successfully',
                data: priceCalculation
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CALCULATE_FARE_PRICE'
            });
        }
    });

    // GET /v1/fares/active
    getActiveFares = asyncErrorHandler(async (req, res, next) => {
        try {
            const fares = await fareService.getActiveFares();
            
            return res.status(200).json({
                success: true,
                message: 'Active fares retrieved successfully',
                data: fares,
                count: fares.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ACTIVE_FARES'
            });
        }
    });

    // GET /v1/fares/zones/:zones
    getFaresByZone = asyncErrorHandler(async (req, res, next) => {
        try {
            const { zones } = req.params;
            const filters = req.query;
            const fares = await fareService.getFaresByZone(parseInt(zones), filters);
            
            return res.status(200).json({
                success: true,
                message: 'Zone-based fares retrieved successfully',
                data: fares,
                count: fares.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_FARES_BY_ZONE'
            });
        }
    });

    // GET /v1/fares/statistics
    getFareStatistics = asyncErrorHandler(async (req, res, next) => {
        try {
            const filters = req.query;
            const stats = await fareService.getFareStatistics(filters);
            
            return res.status(200).json({
                success: true,
                message: 'Fare statistics retrieved successfully',
                data: stats
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_FARE_STATISTICS'
            });
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
            
            return res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    updatedCount: result.updatedCount,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_BULK_UPDATE_FARES'
            });
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
            
            return res.status(200).json({
                success: true,
                message: 'Fares searched successfully',
                data: fares,
                count: fares.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_SEARCH_FARES'
            });
        }
    });

    // GET /v1/fares/health
    healthCheck = asyncErrorHandler(async (req, res, next) => {
        return res.status(200).json({
            success: true,
            message: 'Fare service is healthy',
            timestamp: new Date(),
            service: 'fare-controller'
        });
    });
}

module.exports = new FareController();
