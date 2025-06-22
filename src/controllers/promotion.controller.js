const PromotionService = require('../services/promotion.service');

class PromotionController {
    async createPromotion(req, res) {
        try {
            const promotion = await PromotionService.createPromotion(req.body);
            res.status(201).json(promotion);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getPromotionById(req, res) {
        try {
            const promotion = await PromotionService.getPromotionById(req.params.id);
            if (!promotion) {
                return res.status(404).json({ message: 'Promotion not found' });
            }
            res.json(promotion);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAllPromotions(req, res) {
        try {
            const promotions = await PromotionService.getAllPromotions(req.query);
            res.json(promotions);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updatePromotion(req, res) {
        try {
            const promotion = await PromotionService.updatePromotion(req.params.id, req.body);
            if (!promotion) {
                return res.status(404).json({ message: 'Promotion not found' });
            }
            res.json(promotion);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async deletePromotion(req, res) {
        try {
            const promotion = await PromotionService.deletePromotion(req.params.id);
            if (!promotion) {
                return res.status(404).json({ message: 'Promotion not found' });
            }
            res.json({ message: 'Promotion deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getActivePromotions(req, res) {
        try {
            const promotions = await PromotionService.getActivePromotions();
            res.json(promotions);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getPromotionsByType(req, res) {
        try {
            const promotions = await PromotionService.getPromotionsByType(req.params.type);
            res.json(promotions);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async validatePromotionCode(req, res) {
        try {
            const { code } = req.body;
            const validation = await PromotionService.validatePromotionCode(code);
            res.json(validation);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async applyPromotion(req, res) {
        try {
            const { promotionId, ticketId } = req.body;
            const result = await PromotionService.applyPromotion(promotionId, ticketId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getPromotionStatistics(req, res) {
        try {
            const statistics = await PromotionService.getPromotionStatistics(req.params.id);
            res.json(statistics);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new PromotionController(); 