const { logger } = require('../config/logger');
const { callPassengerDiscount } = require('../grpc/publicClient');

class PassengerDiscountService {
    constructor() {
        logger.info('PassengerDiscountService initialized - using publicClient');
    }

    async fetchAllPassengerDiscounts(filters = {}) {
        try {
            logger.info('Fetching all passenger discounts via gRPC', { filters });
            const response = await callPassengerDiscount('ListPassengerDiscounts', {
                passengerType: filters.passengerType || '',
                includeInactive: Boolean(filters.includeInactive),
                onlyCurrentlyValid: Boolean(filters.onlyCurrentlyValid)
            });
            return response.discounts || [];
        } catch (error) {
            logger.error('Failed to fetch passenger discounts via gRPC', { error: error.message });
            throw new Error(`Failed to fetch passenger discounts: ${error.message}`);
        }
    }

    async fetchPassengerDiscountById(discountId) {
        try {
            logger.info('Fetching passenger discount by ID via gRPC', { discountId });
            const response = await callPassengerDiscount('GetPassengerDiscount', { discountId });
            return response;
        } catch (error) {
            logger.error('Failed to fetch passenger discount via gRPC', { discountId, error: error.message });
            throw new Error(`Failed to fetch passenger discount ${discountId}: ${error.message}`);
        }
    }

    async fetchPassengerDiscountByType(passengerType) {
        try {
            logger.info('Fetching passenger discount by type via gRPC', { passengerType });
            const discounts = await this.fetchAllPassengerDiscounts({ passengerType, includeInactive: false, onlyCurrentlyValid: true });
            return discounts.find(d => d.passengerType === passengerType) || null;
        } catch (error) {
            logger.error('Failed to fetch passenger discount by type via gRPC', { passengerType, error: error.message });
            throw error;
        }
    }
}

module.exports = PassengerDiscountService;


