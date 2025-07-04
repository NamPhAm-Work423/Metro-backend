const { Promotion, Ticket } = require('../models/index.model');
const { Op } = require('sequelize');
const { logger } = require('../config/logger');

class PromotionService {
    async createPromotion(promotionData) {
        try {
            const promotion = await Promotion.create(promotionData);
            logger.info('Promotion created successfully', { promotionId: promotion.promotionId, code: promotion.code });
            return promotion;
        } catch (error) {
            logger.error('Error creating promotion', { error: error.message, promotionData });
            throw error;
        }
    }

    async getAllPromotions(filters = {}) {
        try {
            const where = {};
            
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }
            
            if (filters.type) {
                where.type = filters.type;
            }
            
            if (filters.code) {
                where.code = { [Op.iLike]: `%${filters.code}%` };
            }
            
            if (filters.name) {
                where.name = { [Op.iLike]: `%${filters.name}%` };
            }

            if (filters.validDate) {
                where.validFrom = { [Op.lte]: filters.validDate };
                where.validUntil = { [Op.gte]: filters.validDate };
            }

            const promotions = await Promotion.findAll({
                where,
                include: [
                    {
                        model: Ticket,
                        as: 'tickets',
                        attributes: ['ticketId', 'status', 'discountAmount', 'createdAt'],
                        required: false
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
            
            return promotions;
        } catch (error) {
            logger.error('Error fetching promotions', { error: error.message, filters });
            throw error;
        }
    }

    async getPromotionById(promotionId) {
        try {
            const promotion = await Promotion.findByPk(promotionId, {
                include: [
                    {
                        model: Ticket,
                        as: 'tickets',
                        attributes: ['ticketId', 'passengerId', 'status', 'discountAmount', 'finalPrice', 'createdAt']
                    }
                ]
            });
            
            if (!promotion) {
                throw new Error('Promotion not found');
            }
            
            return promotion;
        } catch (error) {
            logger.error('Error fetching promotion by ID', { error: error.message, promotionId });
            throw error;
        }
    }

    async getPromotionByCode(code) {
        try {
            const promotion = await Promotion.findOne({
                where: { code, isActive: true }
            });
            
            if (!promotion) {
                throw new Error('Promotion not found');
            }
            
            return promotion;
        } catch (error) {
            logger.error('Error fetching promotion by code', { error: error.message, code });
            throw error;
        }
    }

    async updatePromotion(promotionId, updateData) {
        try {
            const promotion = await Promotion.findByPk(promotionId);
            
            if (!promotion) {
                throw new Error('Promotion not found');
            }
            
            const updatedPromotion = await promotion.update(updateData);
            logger.info('Promotion updated successfully', { promotionId });
            return updatedPromotion;
        } catch (error) {
            logger.error('Error updating promotion', { error: error.message, promotionId });
            throw error;
        }
    }

    async deletePromotion(promotionId) {
        try {
            const promotion = await Promotion.findByPk(promotionId);
            
            if (!promotion) {
                throw new Error('Promotion not found');
            }
            
            // Check if promotion is used in any active tickets
            const activeTickets = await Ticket.count({
                where: {
                    promotionId,
                    status: { [Op.in]: ['active', 'used'] },
                    isActive: true
                }
            });
            
            if (activeTickets > 0) {
                throw new Error('Cannot delete promotion that is used in active tickets');
            }
            
            // Soft delete - set isActive to false
            await promotion.update({ isActive: false });
            logger.info('Promotion deactivated successfully', { promotionId });
            return { message: 'Promotion deactivated successfully' };
        } catch (error) {
            logger.error('Error deleting promotion', { error: error.message, promotionId });
            throw error;
        }
    }

    async validatePromotion(code, validationData = {}) {
        try {
            const promotion = await Promotion.findOne({
                where: { code, isActive: true }
            });
            
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
                    code: promotion.code,
                    name: promotion.name,
                    type: promotion.type,
                    value: promotion.value,
                    discountAmount,
                    upgradeToType: validationData.upgradeToType
                }
            };
        } catch (error) {
            logger.error('Error validating promotion', { error: error.message, code });
            throw error;
        }
    }

    async applyPromotion(code, applicationData) {
        try {
            const validation = await this.validatePromotion(code, applicationData);
            
            if (!validation.valid) {
                throw new Error(validation.reason);
            }
            
            const promotion = await Promotion.findOne({
                where: { code, isActive: true }
            });
            
            // Increment usage count
            await promotion.incrementUsage();
            
            logger.info('Promotion applied successfully', {
                promotionId: promotion.promotionId,
                code,
                discountAmount: validation.promotion.discountAmount
            });
            
            return validation.promotion;
        } catch (error) {
            logger.error('Error applying promotion', { error: error.message, code });
            throw error;
        }
    }

    async getActivePromotions(filters = {}) {
        try {
            const currentDate = new Date();
            const where = {
                isActive: true,
                validFrom: { [Op.lte]: currentDate },
                validUntil: { [Op.gte]: currentDate }
            };
            
            if (filters.type) {
                where.type = filters.type;
            }
            
            if (filters.ticketType) {
                where.applicableTicketTypes = { [Op.contains]: [filters.ticketType] };
            }
            
            if (filters.passengerType) {
                where.applicablePassengerTypes = { [Op.contains]: [filters.passengerType] };
            }
            
            // Only include promotions that haven't exceeded their usage limit
            const promotions = await Promotion.findAll({
                where,
                order: [['createdAt', 'DESC']]
            });
            
            // Filter out promotions that have exceeded usage limits
            const validPromotions = promotions.filter(promotion => 
                !promotion.usageLimit || promotion.usageCount < promotion.usageLimit
            );
            
            return validPromotions;
        } catch (error) {
            logger.error('Error fetching active promotions', { error: error.message });
            throw error;
        }
    }

    async getPromotionStatistics(filters = {}) {
        try {
            const where = { isActive: true };
            
            if (filters.dateFrom && filters.dateTo) {
                where.createdAt = {
                    [Op.between]: [filters.dateFrom, filters.dateTo]
                };
            }
            
            if (filters.type) {
                where.type = filters.type;
            }

            const stats = await Promotion.findAll({
                where,
                attributes: [
                    'type',
                    [Promotion.sequelize.fn('COUNT', '*'), 'promotionCount'],
                    [Promotion.sequelize.fn('SUM', Promotion.sequelize.col('usageCount')), 'totalUsage'],
                    [Promotion.sequelize.fn('AVG', Promotion.sequelize.col('value')), 'averageValue']
                ],
                group: ['type'],
                raw: true
            });
            
            return stats;
        } catch (error) {
            logger.error('Error generating promotion statistics', { error: error.message, filters });
            throw error;
        }
    }

    async getPromotionUsageReport(promotionId) {
        try {
            const promotion = await Promotion.findByPk(promotionId, {
                include: [
                    {
                        model: Ticket,
                        as: 'tickets',
                        attributes: ['ticketId', 'passengerId', 'status', 'discountAmount', 'finalPrice', 'createdAt'],
                        order: [['createdAt', 'DESC']]
                    }
                ]
            });
            
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
                    code: promotion.code,
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

    async expirePromotions() {
        try {
            const expiredPromotions = await Promotion.update(
                { isActive: false },
                {
                    where: {
                        isActive: true,
                        validUntil: { [Op.lt]: new Date() }
                    },
                    returning: true
                }
            );
            
            logger.info('Expired promotions deactivated', { count: expiredPromotions[0] });
            return expiredPromotions[0];
        } catch (error) {
            logger.error('Error expiring promotions', { error: error.message });
            throw error;
        }
    }

    /**
     * Get valid promotions for a specific pass type
     * @param {string} passType Type of pass (day, week, month, etc)
     * @returns {Promise<Array>} List of valid promotions
     */
    async getPassPromotions(passType) {
        try {
            const promotions = await Promotion.findAll({
                where: {
                    isActive: true,
                    validFrom: { [Op.lte]: new Date() },
                    validUntil: { [Op.gte]: new Date() },
                    applicableTicketTypes: {
                        [Op.contains]: [passType]
                    }
                }
            });

            return promotions.map(promo => ({
                code: promo.code,
                description: promo.description,
                discountType: promo.discountType,
                discountValue: promo.discountValue,
                maxDiscount: promo.maxDiscount,
                validUntil: promo.validUntil,
                termsAndConditions: promo.termsAndConditions
            }));
        } catch (error) {
            logger.error('Error getting pass promotions', {
                error: error.message,
                passType
            });
            throw error;
        }
    }

    /**
     * Apply promotion to pass upgrade
     * @param {string} promoCode 
     * @param {number} upgradeCost 
     * @param {string} newPassType 
     */
    async applyPassUpgradePromotion(promoCode, upgradeCost, newPassType) {
        try {
            const promotion = await Promotion.findOne({
                where: {
                    code: promoCode,
                    isActive: true,
                    validFrom: { [Op.lte]: new Date() },
                    validUntil: { [Op.gte]: new Date() },
                    applicableTicketTypes: {
                        [Op.contains]: [newPassType]
                    }
                }
            });

            if (!promotion) {
                throw new Error('Invalid or expired promotion code');
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

    /**
     * Get all active promotions for a specific route
     * @param {string} routeId 
     */
    async getRoutePromotions(routeId) {
        try {
            const promotions = await Promotion.findAll({
                where: {
                    isActive: true,
                    validFrom: { [Op.lte]: new Date() },
                    validUntil: { [Op.gte]: new Date() },
                    [Op.or]: [
                        { applicableRoutes: { [Op.contains]: [routeId] } },
                        { applicableRoutes: { [Op.eq]: null } }
                    ]
                }
            });

            return promotions.map(promo => ({
                code: promo.code,
                description: promo.description,
                discountType: promo.discountType,
                discountValue: promo.discountValue,
                maxDiscount: promo.maxDiscount,
                validUntil: promo.validUntil,
                applicableTicketTypes: promo.applicableTicketTypes,
                termsAndConditions: promo.termsAndConditions
            }));
        } catch (error) {
            logger.error('Error getting route promotions', {
                error: error.message,
                routeId
            });
            throw error;
        }
    }
}

module.exports = new PromotionService();
