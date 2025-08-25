const { logger } = require('../config/logger');
const CacheService = require('../services/cache.service');

class TransitPassController {
    constructor() {
        this.cacheService = new CacheService();
    }

    async getAllTransitPasses(req, res) {
        try {
            logger.info('Request for all transit passes', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            const transitPasses = await this.cacheService.getTransitPasses();

            if (!transitPasses) {
                return res.status(404).json({
                    success: false,
                    message: 'Transit passes data not found in cache'
                });
            }

            res.json({
                success: true,
                data: transitPasses,
                count: Array.isArray(transitPasses) ? transitPasses.length : 0,
                cached: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error fetching transit passes', { error: error.message, stack: error.stack, ip: req.ip });
            res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
        }
    }

    async getTransitPassByType(req, res) {
        try {
            const { type } = req.params;
            if (!type) {
                return res.status(400).json({ success: false, message: 'Transit pass type is required' });
            }

            const validTypes = ['day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({ success: false, message: 'Invalid transit pass type', validTypes, provided: type });
            }

            const transitPass = await this.cacheService.getTransitPassByType(type);
            if (!transitPass) {
                return res.status(404).json({ success: false, message: `Transit pass type ${type} not found`, type });
            }

            res.json({
                success: true,
                data: transitPass,
                type,
                cached: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error fetching transit pass by type', { type: req.params.type, error: error.message, stack: error.stack, ip: req.ip });
            res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
        }
    }
}

module.exports = TransitPassController;


