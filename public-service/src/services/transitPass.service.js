const { logger } = require('../config/logger');
const { callTransitPass } = require('../grpc/publicClient');

class TransitPassService {
    constructor() {
        logger.info('TransitPassService initialized - using publicClient');
    }

    async fetchAllTransitPasses(filters = {}) {
        try {
            logger.info('Fetching all transit passes via gRPC', { filters });
            const response = await callTransitPass('ListTransitPasses', {
                transitPassType: filters.transitPassType || '',
                includeInactive: Boolean(filters.includeInactive),
            });
            return response.transitPasses || [];
        } catch (error) {
            logger.error('Failed to fetch transit passes via gRPC', { error: error.message });
            throw new Error(`Failed to fetch transit passes: ${error.message}`);
        }
    }

    async fetchTransitPassById(transitPassId) {
        try {
            logger.info('Fetching transit pass by ID via gRPC', { transitPassId });
            const response = await callTransitPass('GetTransitPass', { transitPassId });
            return response;
        } catch (error) {
            logger.error('Failed to fetch transit pass via gRPC', { transitPassId, error: error.message });
            throw new Error(`Failed to fetch transit pass ${transitPassId}: ${error.message}`);
        }
    }

    async fetchTransitPassByType(transitPassType) {
        try {
            logger.info('Fetching transit pass by type via gRPC', { transitPassType });
            const passes = await this.fetchAllTransitPasses({ transitPassType, includeInactive: false });
            return passes.find(p => p.transitPassType === transitPassType) || null;
        } catch (error) {
            logger.error('Failed to fetch transit pass by type via gRPC', { transitPassType, error: error.message });
            throw error;
        }
    }
}

module.exports = TransitPassService;


