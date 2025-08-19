const promotionService = require('../services/promotion.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');

class PromotionController {
    // POST /v1/promotions
    createPromotion = asyncErrorHandler(async (req, res, next) => {
        const promotionData = req.body;
        const promotion = await promotionService.createPromotion(promotionData);

        res.status(201).json({
            success: true,
            message: 'Promotion created successfully',
            data: promotion
        });
    });

    // GET /v1/promotions
    getAllPromotions = asyncErrorHandler(async (req, res, next) => {
        const filters = req.query;
        const promotions = await promotionService.getAllPromotions(filters);
        
        res.status(200).json({
            success: true,
            message: 'Promotions retrieved successfully',
            data: promotions,
            count: promotions.length
        });
    });

    // GET /v1/promotions/:id
    getPromotionById = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const promotion = await promotionService.getPromotionById(id);
        
        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: 'Promotion not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Promotion retrieved successfully',
            data: promotion
        });
    });

    // GET /v1/promotions/code/:code
    getPromotionByCode = asyncErrorHandler(async (req, res, next) => {
        const { code } = req.params;
        
        try {
            const promotion = await promotionService.getPromotionByCode(code);
            
            res.status(200).json({
                success: true,
                message: 'Promotion retrieved successfully',
                data: promotion
            });
        } catch (error) {
            if (error.message === 'Promotion not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Promotion code not found'
                });
            }
            throw error;
        }
    });

    // PUT /v1/promotions/:id
    updatePromotion = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const updateData = req.body;
        
        try {
            const promotion = await promotionService.updatePromotion(id, updateData);
            
            res.status(200).json({
                success: true,
                message: 'Promotion updated successfully',
                data: promotion
            });
        } catch (error) {
            if (error.message === 'Promotion not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Promotion not found'
                });
            }
            throw error;
        }
    });

    // PUT /v1/promotions/code/:code
    updatePromotionByCode = asyncErrorHandler(async (req, res, next) => {
        const { code } = req.params;
        const updateData = req.body;
        
        try {
            const promotion = await promotionService.updatePromotionByCode(code, updateData);
            
            res.status(200).json({
                success: true,
                message: 'Promotion updated successfully',
                data: promotion
            });
        } catch (error) {
            if (error.message === 'Promotion not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Promotion with code not found'
                });
            }
            throw error;
        }
    });

    // DELETE /v1/promotions/:id
    deletePromotion = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const result = await promotionService.deletePromotion(id);
        
        res.status(200).json({
            success: true,
            message: result.message
        });
    });

    // POST /v1/promotions/:code/validate
    validatePromotion = asyncErrorHandler(async (req, res, next) => {
        const { code } = req.params;
        const validationData = req.body;
        
        const validation = await promotionService.validatePromotion(code, validationData);
        
        const statusCode = validation.valid ? 200 : 400;
        
        res.status(statusCode).json({
            success: validation.valid,
            message: validation.valid ? 'Promotion is valid' : validation.reason,
            data: validation
        });
    });

    // POST /v1/promotions/:code/apply
    applyPromotion = asyncErrorHandler(async (req, res, next) => {
        const { code } = req.params;
        const applicationData = req.body;
        
        try {
            const appliedPromotion = await promotionService.applyPromotion(code, applicationData);
            
            res.status(200).json({
                success: true,
                message: 'Promotion applied successfully',
                data: appliedPromotion
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    });

    // GET /v1/promotions/active
    getActivePromotions = asyncErrorHandler(async (req, res, next) => {
        const filters = req.query;
        const promotions = await promotionService.getActivePromotions(filters);
        
        res.status(200).json({
            success: true,
            message: 'Active promotions retrieved successfully',
            data: promotions,
            count: promotions.length
        });
    });

    // GET /v1/promotions/statistics
    getPromotionStatistics = asyncErrorHandler(async (req, res, next) => {
        const filters = req.query;
        const stats = await promotionService.getPromotionStatistics(filters);
        
        res.status(200).json({
            success: true,
            message: 'Promotion statistics retrieved successfully',
            data: stats
        });
    });

    // GET /v1/promotions/:id/usage-report
    getPromotionUsageReport = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const report = await promotionService.getPromotionUsageReport(id);
        
        res.status(200).json({
            success: true,
            message: 'Promotion usage report retrieved successfully',
            data: report
        });
    });

    // POST /v1/promotions/expire
    expirePromotions = asyncErrorHandler(async (req, res, next) => {
        const expiredCount = await promotionService.expirePromotions();
        
        res.status(200).json({
            success: true,
            message: 'Expired promotions processed successfully',
            data: {
                expiredCount,
                processedAt: new Date()
            }
        });
    });

    // GET /v1/promotions/search
    searchPromotions = asyncErrorHandler(async (req, res, next) => {
        const { 
            ticketType, 
            passengerType, 
            routeId, 
            dateTime,
            minPurchaseAmount 
        } = req.query;
        
        const filters = {};
        
        if (ticketType) filters.ticketType = ticketType;
        if (passengerType) filters.passengerType = passengerType;
        
        const promotions = await promotionService.getActivePromotions(filters);
        
        // Further filter by route and other criteria
        const filteredPromotions = promotions.filter(promotion => {
            // Check route restriction
            if (routeId && promotion.applicableRoutes.length > 0) {
                if (!promotion.applicableRoutes.includes(routeId)) {
                    return false;
                }
            }
            
            // Check minimum purchase amount
            if (minPurchaseAmount && promotion.minPurchaseAmount) {
                if (parseFloat(minPurchaseAmount) < promotion.minPurchaseAmount) {
                    return false;
                }
            }
            
            // Check date/time validity
            if (dateTime) {
                const checkDate = new Date(dateTime);
                if (!promotion.isValidForDateTime(checkDate)) {
                    return false;
                }
            }
            
            return true;
        });
        
        res.status(200).json({
            success: true,
            message: 'Promotions searched successfully',
            data: filteredPromotions,
            count: filteredPromotions.length
        });
    });

    // POST /v1/promotions/validate-bulk
    validatePromotionsBulk = asyncErrorHandler(async (req, res, next) => {
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
        
        res.status(200).json({
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
    });

    // GET /v1/promotions/health
    healthCheck = asyncErrorHandler(async (req, res, next) => {
        res.status(200).json({
            success: true,
            message: 'Promotion service is healthy',
            timestamp: new Date(),
            service: 'promotion-controller'
        });
    });
}

module.exports = new PromotionController();
