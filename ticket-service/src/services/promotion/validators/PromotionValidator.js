const { logger } = require('../../../config/logger');
const IPromotionValidator = require('../interfaces/IPromotionValidator');

/**
 * Promotion Validator - Single Responsibility: Validate and apply promotions
 * Following Single Responsibility Principle - only handles promotion validation and application
 */
class PromotionValidator extends IPromotionValidator {
    constructor(promotionRepository) {
        super();
        this.promotionRepository = promotionRepository;
    }

    async validatePromotion(promotionCode, validationData = {}) {
        try {
            const promotion = await this.promotionRepository.findByCode(promotionCode);
            
            if (!promotion) {
                return { valid: false, reason: 'Promotion code not found' };
            }
            
            // Check if promotion is currently valid
            if (!promotion.isCurrentlyValid()) {
                if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
                    return { valid: false, reason: 'Promotion usage limit exceeded' };
                }
                
                const now = new Date();
                if (promotion.validFrom > now) {
                    return { valid: false, reason: 'Promotion is not yet active' };
                }
                if (promotion.validUntil < now) {
                    return { valid: false, reason: 'Promotion has expired' };
                }
            }
            
            // Check date/time restrictions
            const checkDate = validationData.dateTime || new Date();
            if (!promotion.isValidForDateTime(checkDate)) {
                return { valid: false, reason: 'Promotion is not valid for the selected date/time' };
            }
            
            // Special handling for pass upgrades
            if (promotion.type === 'free_upgrade' && validationData.ticketType?.includes('pass')) {
                const passTypes = ['day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass'];
                const currentPassIndex = passTypes.indexOf(validationData.ticketType);
                
                if (currentPassIndex === -1 || currentPassIndex === passTypes.length - 1) {
                    return { valid: false, reason: 'Cannot upgrade this pass type' };
                }
                
                // Set the upgrade target
                validationData.upgradeToType = passTypes[currentPassIndex + 1];
            }
            
            // Check ticket type restrictions
            if (validationData.ticketType && 
                promotion.applicableTicketTypes.length > 0 && 
                !promotion.applicableTicketTypes.includes(validationData.ticketType)) {
                return { valid: false, reason: 'Promotion is not applicable to this ticket type' };
            }
            
            // Check passenger type restrictions
            if (validationData.passengerType && 
                promotion.applicablePassengerTypes.length > 0 && 
                !promotion.applicablePassengerTypes.includes(validationData.passengerType)) {
                return { valid: false, reason: 'Promotion is not applicable to this passenger type' };
            }
            
            // Check route restrictions
            if (validationData.routeId && 
                promotion.applicableRoutes.length > 0 && 
                !promotion.applicableRoutes.includes(validationData.routeId)) {
                return { valid: false, reason: 'Promotion is not applicable to this route' };
            }
            
            // Check minimum purchase amount
            if (promotion.minPurchaseAmount && 
                validationData.purchaseAmount && 
                validationData.purchaseAmount < promotion.minPurchaseAmount) {
                return { valid: false, reason: `Minimum purchase amount of ${promotion.minPurchaseAmount} required` };
            }
            
            // Calculate discount
            const originalPrice = validationData.originalPrice || 0;
            const discountAmount = promotion.calculateDiscount(originalPrice);
            
            return {
                valid: true,
                promotion: {
                    promotionId: promotion.promotionId,
                    promotionCode: promotion.promotionCode,
                    name: promotion.name,
                    type: promotion.type,
                    value: promotion.value,
                    discountAmount,
                    upgradeToType: validationData.upgradeToType
                }
            };
        } catch (error) {
            logger.error('Error validating promotion', { error: error.message, promotionCode: promotion.promotionCode });
            throw error;
        }
    }

    async applyPromotion(promotionCode, applicationData) {
        try {
            const validation = await this.validatePromotion(promotionCode, applicationData);
            
            if (!validation.valid) {
                throw new Error(validation.reason);
            }
            
            const promotion = await this.promotionRepository.findByCode(promotionCode);
            
            // Increment usage count
            await promotion.incrementUsage();
            
            logger.info('Promotion applied successfully', {
                promotionId: promotion.promotionId,
                promotionCode: promotion.promotionCode,
                discountAmount: validation.promotion.discountAmount
            });
            
            return validation.promotion;
        } catch (error) {
            logger.error('Error applying promotion', { error: error.message, promotionCode: promotion.promotionCode });
            throw error;
        }
    }

    async getPromotionUsageReport(promotionId) {
        try {
            const promotion = await this.promotionRepository.findById(promotionId);
            
            if (!promotion) {
                throw new Error('Promotion not found');
            }
            
            const totalDiscountGiven = promotion.tickets.reduce(
                (sum, ticket) => sum + parseFloat(ticket.discountAmount || 0), 
                0
            );
            
            const usageByStatus = promotion.tickets.reduce((acc, ticket) => {
                acc[ticket.status] = (acc[ticket.status] || 0) + 1;
                return acc;
            }, {});
            
            return {
                promotion: {
                    promotionId: promotion.promotionId,
                    promotionCode: promotion.promotionCode,
                    name: promotion.name,
                    type: promotion.type,
                    value: promotion.value,
                    usageLimit: promotion.usageLimit,
                    usageCount: promotion.usageCount
                },
                usage: {
                    totalUsage: promotion.tickets.length,
                    totalDiscountGiven,
                    usageByStatus,
                    remainingUsage: promotion.usageLimit ? promotion.usageLimit - promotion.usageCount : null
                },
                tickets: promotion.tickets
            };
        } catch (error) {
            logger.error('Error generating promotion usage report', { error: error.message, promotionId });
            throw error;
        }
    }

    async getPassPromotions(passType) {
        return await this.promotionRepository.findPassPromotions(passType);
    }

    async applyPassUpgradePromotion(promoCode, upgradeCost, newPassType) {
        try {
            const promotion = await this.promotionRepository.findByCode(promoCode);
            
            if (!promotion) {   
                throw new Error('Invalid or expired promotion code');
            }

            // Validate that promotion is applicable to the new pass type
            if (promotion.applicableTicketTypes && 
                promotion.applicableTicketTypes.length > 0 && 
                !promotion.applicableTicketTypes.includes(newPassType)) {
                throw new Error('Promotion is not applicable to this pass type');
            }

            // Calculate discount
            let discount = 0;
            if (promotion.discountType === 'percentage') {
                discount = (upgradeCost * promotion.discountValue) / 100;
                if (promotion.maxDiscount) {
                    discount = Math.min(discount, promotion.maxDiscount);
                }
            } else {
                discount = promotion.discountValue;
            }

            // Round to nearest 1000
            discount = Math.round(discount / 1000) * 1000;
            const finalPrice = Math.max(0, upgradeCost - discount);

            return {
                originalPrice: upgradeCost,
                discount,
                finalPrice,
                promoCode,
                promoDescription: promotion.description
            };
        } catch (error) {
            logger.error('Error applying pass upgrade promotion', {
                error: error.message,
                promoCode,
                upgradeCost,
                newPassType
            });
            throw error;
        }
    }

    async getRoutePromotions(routeId) {
        return await this.promotionRepository.findRoutePromotions(routeId);
    }
}

module.exports = PromotionValidator;
