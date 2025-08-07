const PromotionRepository = require('./repositories/PromotionRepository');
const PromotionValidator = require('./validators/PromotionValidator');
const PromotionService = require('./PromotionService');

/**
 * Factory for creating PromotionService with all dependencies properly injected
 * Following Dependency Inversion Principle - high-level modules don't depend on low-level modules
 */
class PromotionServiceFactory {
    /**
     * Create a fully configured PromotionService instance
     * @returns {PromotionService} Configured promotion service
     */
    static createPromotionService() {
        // Create repositories
        const promotionRepository = new PromotionRepository();
        
        // Create validators
        const promotionValidator = new PromotionValidator(promotionRepository);
        
        // Create and return the main service
        return new PromotionService(promotionRepository, promotionValidator);
    }

    /**
     * Create individual components for testing or specific use cases
     */
    static createPromotionRepository() {
        return new PromotionRepository();
    }

    static createPromotionValidator(promotionRepository) {
        return new PromotionValidator(promotionRepository);
    }

    static createPromotionServiceWithDependencies(promotionRepository, promotionValidator) {
        return new PromotionService(promotionRepository, promotionValidator);
    }
}

module.exports = PromotionServiceFactory;
