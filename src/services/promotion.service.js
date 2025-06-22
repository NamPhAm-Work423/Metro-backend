const Promotion = require('../models/promotion.model');
const { AppError } = require('../middlewares/errorHandler');

class PromotionService {
    async createPromotion(promotionData) {
        try {
            const promotion = new Promotion(promotionData);
            await promotion.save();
            return promotion;
        } catch (error) {
            throw new AppError('Error creating promotion', 500);
        }
    }

    async getPromotionById(id) {
        try {
            const promotion = await Promotion.findById(id);
            if (!promotion) {
                throw new AppError('Promotion not found', 404);
            }
            return promotion;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error finding promotion', 500);
        }
    }

    async getAllPromotions() {
        try {
            const promotions = await Promotion.find();
            return promotions;
        } catch (error) {
            throw new AppError('Error fetching promotions', 500);
        }
    }

    async updatePromotion(id, updateData) {
        try {
            const promotion = await Promotion.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );
            if (!promotion) {
                throw new AppError('Promotion not found', 404);
            }
            return promotion;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error updating promotion', 500);
        }
    }

    async deletePromotion(id) {
        try {
            const promotion = await Promotion.findByIdAndDelete(id);
            if (!promotion) {
                throw new AppError('Promotion not found', 404);
            }
            return promotion;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error deleting promotion', 500);
        }
    }

    async getActivePromotions() {
        try {
            const currentDate = new Date();
            const promotions = await Promotion.find({
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate },
                status: 'active'
            });
            return promotions;
        } catch (error) {
            throw new AppError('Error fetching active promotions', 500);
        }
    }

    async getPromotionsByType(type) {
        try {
            const promotions = await Promotion.find({ type });
            return promotions;
        } catch (error) {
            throw new AppError('Error fetching promotions by type', 500);
        }
    }

    async validatePromotion(promotionId) {
        try {
            const promotion = await Promotion.findById(promotionId);
            if (!promotion) {
                throw new AppError('Promotion not found', 404);
            }

            const currentDate = new Date();
            if (currentDate < promotion.startDate || currentDate > promotion.endDate) {
                throw new AppError('Promotion is not active', 400);
            }

            if (promotion.status !== 'active') {
                throw new AppError('Promotion is not active', 400);
            }

            return promotion;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error validating promotion', 500);
        }
    }

    async getPromotionStats() {
        try {
            const totalPromotions = await Promotion.countDocuments();
            const activePromotions = await Promotion.countDocuments({ status: 'active' });
            const promotionsByType = await Promotion.aggregate([
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ]);

            return {
                totalPromotions,
                activePromotions,
                promotionsByType
            };
        } catch (error) {
            throw new AppError('Error fetching promotion statistics', 500);
        }
    }
}

module.exports = new PromotionService(); 