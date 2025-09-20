const promotionService = require('../services/promotion.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const { logger } = require('../config/logger');
const { addCustomSpan } = require('../tracing');

class PromotionController {
    // POST /v1/promotions
    createPromotion = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('promotion.create', async (span) => {
            const promotionData = req.body;
            span.setAttributes({ 
                'operation.type': 'create', 
                'operation.entity': 'promotion', 
                'request.authenticated': !!req.user, 
                'user.id': req.user?.id || 'unknown',
                'type': promotionData.type 
            });
            try {
                logger.traceInfo('Creating promotion', { requestedBy: req.user?.id });
                const promotion = await addCustomSpan('promotion.service.create', async () => promotionService.createPromotion(promotionData));
                span.setAttributes({ 
                    'operation.success': true, 
                    'http.status_code': 201, 
                    'type': promotionData.type 
                });
                return res.status(201).json({
                    success: true,
                    message: 'Promotion created successfully',
                    data: promotion,
                    type: promotionData.type 
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500,
                    'type': promotionData.type 
                });
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_CREATE_PROMOTION',
                    type: promotionData.type 
                });
            }
        });
    });

    // GET /v1/promotions
    getAllPromotions = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('promotion.get-all', async (span) => {
            span.setAttributes({ 
                'operation.type': 'read', 
                'operation.entity': 'promotion', 
                'operation.scope': 'all', 
                'query.has_filters': Object.keys(req.query || {}).length > 0,
                
            });
            try {
                const filters = req.query;
                const promotions = await addCustomSpan('promotion.service.get-all', async () => promotionService.getAllPromotions(filters));
                span.setAttributes({ 
                    'operation.success': true, 
                    'items.count': promotions.length, 
                    'http.status_code': 200,
                    
                });
                return res.status(200).json({
                    success: true,
                    message: 'Promotions retrieved successfully',
                    data: promotions,
                    count: promotions.length
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500,
                    
                });
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_GET_ALL_PROMOTIONS',
                    type: 'all' 
                });
            }
        });
    });

    // GET /v1/promotions/:id
    getPromotionById = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('promotion.get-by-id', async (span) => {
            const { id } = req.params;
            span.setAttributes({ 
                'operation.type': 'read', 
                'operation.entity': 'promotion', 
                'promotion.id': id,
                
            });
            try {
                const promotion = await addCustomSpan('promotion.service.get-by-id', async () => promotionService.getPromotionById(id));
                if (!promotion) {
                    span.setAttributes({ 
                        'operation.success': false, 
                        'http.status_code': 404,
                        
                    });
                    return res.status(404).json({
                        success: false,
                        message: 'Promotion not found'
                    });
                }
                span.setAttributes({ 
                    'operation.success': true, 
                    'http.status_code': 200,
                    
                });
                return res.status(200).json({
                    success: true,
                    message: 'Promotion retrieved successfully',
                    data: promotion
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500,
                    
                });
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_GET_PROMOTION_BY_ID',
                    type: 'all' 
                });
            }
        });
    });

    // GET /v1/promotions/code/:code
    getPromotionByCode = asyncErrorHandler(async (req, res, next) => {
        const { code } = req.params;
        await addCustomSpan('promotion.get-by-code', async (span) => {
            span.setAttributes({ 
                'operation.type': 'read', 
                'operation.entity': 'promotion', 
                'promotion.code': code,
                
            });
            try {
                const promotion = await addCustomSpan('promotion.service.get-by-code', async () => promotionService.getPromotionByCode(code));
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({
                    success: true,
                    message: 'Promotion retrieved successfully',
                    data: promotion
                });
            } catch (error) {
                if (error.message === 'Promotion not found') {
                    span.setAttributes({ 'operation.success': false, 'http.status_code': 404 });
                    return res.status(404).json({
                        success: false,
                        message: 'Promotion code not found'
                    });
                }
                span.recordException(error);
                throw error;
            }
        });
    });

    // PUT /v1/promotions/:id
    updatePromotion = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const updateData = req.body;
        await addCustomSpan('promotion.update', async (span) => {
            span.setAttributes({ 
                'operation.type': 'update', 
                'operation.entity': 'promotion', 
                'promotion.id': id,
                
            });
            try {
                const promotion = await addCustomSpan('promotion.service.update', async () => promotionService.updatePromotion(id, updateData));
                span.setAttributes({ 
                    'operation.success': true, 
                    'http.status_code': 200,
                    
                });
                res.status(200).json({
                    success: true,
                    message: 'Promotion updated successfully',
                    data: promotion
                });
            } catch (error) {
                if (error.message === 'Promotion not found') {
                    span.setAttributes({ 
                        'operation.success': false, 
                        'http.status_code': 404,
                        
                    });
                    return res.status(404).json({
                        success: false,
                        message: 'Promotion not found'
                    });
                }
                span.recordException(error);
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_UPDATE_PROMOTION_BY_CODE'
                });
            }
        });
    });

    // PUT /v1/promotions/code/:code
    updatePromotionByCode = asyncErrorHandler(async (req, res, next) => {
        const { code } = req.params;
        const updateData = req.body;
        await addCustomSpan('promotion.update-by-code', async (span) => {
            span.setAttributes({ 
                'operation.type': 'update', 
                'operation.entity': 'promotion', 
                'promotion.code': code,
                
            });
            try {
                const promotion = await addCustomSpan('promotion.service.update-by-code', async () => promotionService.updatePromotionByCode(code, updateData));
                span.setAttributes({ 
                    'operation.success': true, 
                    'http.status_code': 200,
                    
                });
                return res.status(200).json({
                    success: true,
                    message: 'Promotion updated successfully',
                    data: promotion
                });
            } catch (error) {
                if (error.message === 'Promotion not found') {
                    span.setAttributes({ 
                        'operation.success': false, 
                        'http.status_code': 404,
                        
                    });
                    return res.status(404).json({
                        success: false,
                        message: 'Promotion with code not found'
                    });
                }
                span.recordException(error);
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_UPDATE_PROMOTION_BY_CODE'
                });
            }
        });
    });

    // DELETE /v1/promotions/:id
    deletePromotion = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('promotion.delete', async (span) => {
            const { id } = req.params;
            span.setAttributes({ 
                'operation.type': 'delete', 
                'operation.entity': 'promotion', 
                'promotion.id': id,
                
            });
            try {
                const result = await addCustomSpan('promotion.service.delete', async () => promotionService.deletePromotion(id));
                span.setAttributes({ 
                    'operation.success': true, 
                    'http.status_code': 200,
                    
                });
                return res.status(200).json({
                    success: true,
                    message: result.message
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_DELETE_PROMOTION'
                });
            }
        });
    });

    // POST /v1/promotions/:code/validate
    validatePromotion = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('promotion.validate', async (span) => {
            const { code } = req.params;
            const validationData = req.body;
            span.setAttributes({ 
                'operation.type': 'validate', 
                'operation.entity': 'promotion', 
                'promotion.code': code,
                
            });
            try {
                const validation = await addCustomSpan('promotion.service.validate', async () => promotionService.validatePromotion(code, validationData));
                const statusCode = validation.valid ? 200 : 400;
                span.setAttributes({ 
                    'operation.success': validation.valid, 
                    'http.status_code': statusCode,
                    
                });
                res.status(statusCode).json({
                    success: validation.valid,
                    message: validation.valid ? 'Promotion is valid' : validation.reason,
                    data: validation
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500 
                });
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_VALIDATE_PROMOTION'
                });
            }
        });
    });

    // POST /v1/promotions/:code/apply
    applyPromotion = asyncErrorHandler(async (req, res, next) => {
        const { code } = req.params;
        const applicationData = req.body;
        await addCustomSpan('promotion.apply', async (span) => {
            span.setAttributes({ 
                'operation.type': 'apply', 
                'operation.entity': 'promotion', 
                'promotion.code': code,
                
            });
            try {
                const appliedPromotion = await addCustomSpan('promotion.service.apply', async () => promotionService.applyPromotion(code, applicationData));
                span.setAttributes({ 
                    'operation.success': true, 
                    'http.status_code': 200 
                });
                return res.status(200).json({
                    success: true,
                    message: 'Promotion applied successfully',
                    data: appliedPromotion
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'http.status_code': 400, 
                    'error.message': error.message 
                });
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_APPLY_PROMOTION'
                });
            }
        });
    });

    // GET /v1/promotions/active
    getActivePromotions = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('promotion.get-active', async (span) => {
            const filters = req.query;
            span.setAttributes({ 
                'operation.type': 'read', 
                'operation.entity': 'promotion', 
                'operation.scope': 'active', 
                'query.has_filters': Object.keys(filters || {}).length > 0 
            });
            try {
                const promotions = await addCustomSpan('promotion.service.get-active', async () => promotionService.getActivePromotions(filters));
                span.setAttributes({ 
                    'operation.success': true, 
                    'items.count': promotions.length, 
                    'http.status_code': 200 
                });
                return res.status(200).json({
                    success: true,
                    message: 'Active promotions retrieved successfully',
                    data: promotions,
                    count: promotions.length
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500 
                });
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_GET_ACTIVE_PROMOTIONS'
                });
            }
        });
    });

    // GET /v1/promotions/statistics
    getPromotionStatistics = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('promotion.get-statistics', async (span) => {
            const filters = req.query;
            span.setAttributes({ 
                'operation.type': 'read', 
                'operation.entity': 'promotion', 
                'operation.scope': 'statistics' 
            });
            try {
                const stats = await addCustomSpan('promotion.service.get-statistics', async () => promotionService.getPromotionStatistics(filters));
                span.setAttributes({ 
                    'operation.success': true, 
                    'http.status_code': 200 
                });
                return res.status(200).json({
                    success: true,
                    message: 'Promotion statistics retrieved successfully',
                    data: stats
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500 
                });
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_GET_PROMOTION_STATISTICS'
                });
            }
        });
    });

    // GET /v1/promotions/:id/usage-report
    getPromotionUsageReport = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('promotion.get-usage-report', async (span) => {
            const { id } = req.params;
            span.setAttributes({ 
                'operation.type': 'read', 
                'operation.entity': 'promotion', 
                'promotion.id': id, 
                'operation.scope': 'usage_report' 
            });
            try {
                const report = await addCustomSpan('promotion.service.get-usage-report', async () => promotionService.getPromotionUsageReport(id));
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({
                    success: true,
                    message: 'Promotion usage report retrieved successfully',
                    data: report
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500 
                });
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_GET_PROMOTION_USAGE_REPORT'
                });
            }
        });
    });

    // POST /v1/promotions/expire
    expirePromotions = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('promotion.expire', async (span) => {
            span.setAttributes({ 
                'operation.type': 'update', 
                'operation.entity': 'promotion', 
                'operation.scope': 'expire' 
            });
            try {
                const expiredCount = await addCustomSpan('promotion.service.expire', async () => promotionService.expirePromotions());
                span.setAttributes({ 
                    'operation.success': true, 
                    'http.status_code': 200 
                });
                return res.status(200).json({
                    success: true,
                    message: 'Expired promotions processed successfully',
                    data: {
                        expiredCount,
                        processedAt: new Date()
                    }
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500 
                });
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_EXPIRE_PROMOTIONS'
                });
            }
        });
    });

    // GET /v1/promotions/search
    searchPromotions = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('promotion.search', async (span) => {
            try {
                const { 
                    ticketType, 
                    passengerType, 
                    routeId, 
                    dateTime,
                    minPurchaseAmount 
                } = req.query;
                span.setAttributes({ 
                    'operation.type': 'read', 
                    'operation.entity': 'promotion', 
                    'operation.scope': 'search' 
                });
                
                const filters = {};
                
                if (ticketType) filters.ticketType = ticketType;
                if (passengerType) filters.passengerType = passengerType;
                
                const promotions = await addCustomSpan('promotion.service.get-active', async () => promotionService.getActivePromotions(filters));
                
                // Further filter by route and other criteria
                const filteredPromotions = promotions.filter(promotion => {
                    if (routeId && promotion.applicableRoutes.length > 0) {
                        if (!promotion.applicableRoutes.includes(routeId)) {
                            return false;
                        }
                    }
                    if (minPurchaseAmount && promotion.minPurchaseAmount) {
                        if (parseFloat(minPurchaseAmount) < promotion.minPurchaseAmount) {
                            return false;
                        }
                    }
                    if (dateTime) {
                        const checkDate = new Date(dateTime);
                        if (!promotion.isValidForDateTime(checkDate)) {
                            return false;
                        }
                    }
                    return true;
                });
                
                span.setAttributes({ 
                    'operation.success': true, 
                    'items.count': filteredPromotions.length, 
                    'http.status_code': 200,
                    
                });
                return res.status(200).json({
                    success: true,
                    message: 'Promotions searched successfully',
                    data: filteredPromotions,
                    count: filteredPromotions.length
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 
                    'operation.success': false, 
                    'error.message': error.message, 
                    'http.status_code': 500,
                    
                });
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_SEARCH_PROMOTIONS'
                });
            }
        });
    });

    // POST /v1/promotions/validate-bulk
    validatePromotionsBulk = asyncErrorHandler(async (req, res, next) => {
        try {
            const { codes, validationData } = req.body;
            
            if (!codes || !Array.isArray(codes)) {
                return res.status(400).json({
                    success: false,
                    message: 'Codes array is required'
                });
            }
            
            const validations = await Promise.all(
                codes.map(async (code) => {
                    try {
                        const validation = await promotionService.validatePromotion(code, validationData);
                        return {
                            code,
                            ...validation
                        };
                    } catch (error) {
                        return {
                            code,
                            valid: false,
                            reason: error.message
                        };
                    }
                })
            );
            
            const validPromotions = validations.filter(v => v.valid);
            const invalidPromotions = validations.filter(v => !v.valid);
            
            return res.status(200).json({
                success: true,
                message: 'Bulk promotion validation completed',
                data: {
                    validPromotions,
                    invalidPromotions,
                    totalValidated: validations.length,
                    validCount: validPromotions.length,
                    invalidCount: invalidPromotions.length
                }
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_VALIDATE_PROMOTIONS_BULK'
            });
        }
    });

    // GET /v1/promotions/health
    healthCheck = asyncErrorHandler(async (req, res, next) => {
        return res.status(200).json({
            success: true,
            message: 'Promotion service is healthy',
            timestamp: new Date(),
            service: 'promotion-controller'
        });
    });
}

module.exports = new PromotionController();
