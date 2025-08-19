const IPromotionService = require('./interfaces/IPromotionService');
const IPromotionValidator = require('./interfaces/IPromotionValidator');
const { logger } = require('../../config/logger');

/**
 * Main Promotion Service - Orchestrates promotion operations using dependency injection
 * Following Dependency Inversion Principle - depends on abstractions, not concretions
 */
class PromotionService extends IPromotionService {
    constructor(promotionRepository, promotionValidator) {
        super();
        this.promotionRepository = promotionRepository;
        this.promotionValidator = promotionValidator;
    }

    // CRUD Operations
    async createPromotion(promotionData) {
        return await this.promotionRepository.create(promotionData);
    }

    async getAllPromotions(filters = {}) {
        logger.info('getAllPromotions called with filters:', filters);
        return await this.promotionRepository.findAll(filters);
    }

    async getPromotionById(promotionId) {
        return await this.promotionRepository.findById(promotionId);
    }

    async getPromotionByCode(promotionCode) {
        return await this.promotionRepository.findByCode(promotionCode);
    }

    async updatePromotion(promotionIdOrCode, updateData) {
        return await this.promotionRepository.update(promotionIdOrCode, updateData);
    }

    async updatePromotionByCode(promotionCode, updateData) {
        return await this.promotionRepository.update(promotionCode, updateData);
    }

    async deletePromotion(promotionId) {
        return await this.promotionRepository.delete(promotionId);
    }

    async getActivePromotions(filters = {}) {
        return await this.promotionRepository.findActive(filters);
    }

    async getPromotionStatistics(filters = {}) {
        return await this.promotionRepository.getStatistics(filters);
    }

    async expirePromotions() {
        return await this.promotionRepository.expirePromotions();
    }

    // Validation operations - delegate to validator
    async validatePromotion(promotionCode, validationData = {}) {
        return await this.promotionValidator.validatePromotion(promotionCode, validationData);
    }

    async applyPromotion(promotionCode, applicationData) {
        return await this.promotionValidator.applyPromotion(promotionCode, applicationData);
    }

    async getPromotionUsageReport(promotionId) {
        return await this.promotionValidator.getPromotionUsageReport(promotionId);
    }

    async getPassPromotions(passType) {
        return await this.promotionValidator.getPassPromotions(passType);
    }

    async applyPassUpgradePromotion(promoCode, upgradeCost, newPassType) {
        return await this.promotionValidator.applyPassUpgradePromotion(promoCode, upgradeCost, newPassType);
    }

    async getRoutePromotions(routeId) {
        return await this.promotionValidator.getRoutePromotions(routeId);
    }
}

module.exports = PromotionService;
