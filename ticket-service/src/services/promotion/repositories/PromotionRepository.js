const { Promotion, Ticket } = require('../../../models/index.model');
const { Op } = require('sequelize');
const { logger } = require('../../../config/logger');

/**
 * Promotion Repository - Single Responsibility: Data access for Promotion entities
 * Following Single Responsibility Principle - only handles promotion data operations
 */
class PromotionRepository {
    async create(promotionData) {
        try {
            const promotion = await Promotion.create(promotionData);
            logger.info('Promotion created successfully', { 
                promotionId: promotion.promotionId, 
                promotionCode: promotion.promotionCode 
            });
            return {
                success: true,
                message: 'Promotion created successfully',
                data: {
                    promotionCode: promotion.promotionCode,
                    promotionId: promotion.promotionId
                }
            };
        } catch (error) {
            logger.error('Error creating promotion', { error: error.message, promotionData });
            throw error;
        }
    }

    async findAll(filters = {}) {
        try {
            const where = {};
            
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }
            
            if (filters.type) {
                where.type = filters.type;
            }
            
            if (filters.promotionCode) {
                where.promotionCode = { [Op.iLike]: `%${filters.promotionCode}%` };
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

    async findById(promotionId) {
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

    async findByCode(promotionCode) {
        try {
            const promotion = await Promotion.findOne({
                where: { promotionCode, isActive: true }
            });
            
            if (!promotion) {
                throw new Error('Promotion not found');
            }
            
            return promotion;
        } catch (error) {
            logger.error('Error fetching promotion by code', { error: error.message, promotionCode });
            throw error;
        }
        }

    async update(promotionId, updateData) {
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

    async delete(promotionId) {
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
            
            await promotion.destroy();
            logger.info('Promotion deactivated successfully', { promotionId });
            return { message: 'Promotion deactivated successfully' };
        } catch (error) {
            logger.error('Error deleting promotion', { error: error.message, promotionId });
            throw error;
        }
    }

    async findActive(filters = {}) {
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

    async getStatistics(filters = {}) {
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

    async findPassPromotions(passType) {
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
                promotionCode: promo.promotionCode,
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

    async findRoutePromotions(routeId) {
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
                promotionCode: promo.promotionCode,
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

module.exports = PromotionRepository;
