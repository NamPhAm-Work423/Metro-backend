const { logger } = require('../config/logger');
const CacheService = require('../services/cache.service');

class PassengerDiscountController {
    constructor() {
        this.cacheService = new CacheService();
    }

    async getAllPassengerDiscounts(req, res) {
        try {
            logger.info('Request for all passenger discounts', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const discounts = await this.cacheService.getPassengerDiscounts();

            if (!discounts) {
                return res.status(404).json({
                    success: false,
                    message: 'Passenger discounts not found in cache'
                });
            }

            res.json({
                success: true,
                data: discounts,
                count: Array.isArray(discounts) ? discounts.length : 0,
                cached: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error fetching passenger discounts', { error: error.message, stack: error.stack, ip: req.ip });
            res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
        }
    }

    async getPassengerDiscountByType(req, res) {
        try {
            const { type } = req.params;
            if (!type) {
                return res.status(400).json({ success: false, message: 'Passenger type is required' });
            }

            const discounts = await this.cacheService.getPassengerDiscounts();
            const discount = Array.isArray(discounts) ? discounts.find(d => d.passengerType === type) : null;
            if (!discount) {
                return res.status(404).json({ success: false, message: `Passenger discount type ${type} not found`, type });
            }

            res.json({
                success: true,
                data: discount,
                type,
                cached: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error fetching passenger discount by type', { type: req.params.type, error: error.message, stack: error.stack, ip: req.ip });
            res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
        }
    }
}

module.exports = PassengerDiscountController;


