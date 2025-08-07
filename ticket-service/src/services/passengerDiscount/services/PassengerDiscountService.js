const IPassengerDiscountService = require('../interfaces/IPassengerDiscountService');
const PassengerDiscountRepository = require('../repositories/PassengerDiscountRepository');

class PassengerDiscountService extends IPassengerDiscountService {
    async getAllPassengerDiscounts() {
        return PassengerDiscountRepository.findAll();
    }
    async getPassengerDiscountByType(passengerType) {
        return PassengerDiscountRepository.findByType(passengerType);
    }
    async createPassengerDiscount(discountData) {
        // Check if exists
        const existing = await PassengerDiscountRepository.findByType(discountData.passengerType);
        if (existing) throw new Error('Discount already exists for this passenger type');
        return PassengerDiscountRepository.create(discountData);
    }
    async updatePassengerDiscount(discountId, updateData) {
        const updated = await PassengerDiscountRepository.update(discountId, updateData);
        if (!updated) throw new Error('Passenger discount not found');
        return updated;
    }
    async deletePassengerDiscount(discountId) {
        const deleted = await PassengerDiscountRepository.delete(discountId);
        if (!deleted) throw new Error('Passenger discount not found');
        return true;
    }
    async calculateDiscount(passengerType, originalPrice) {
        const discount = await PassengerDiscountRepository.findByType(passengerType);
        if (!discount) throw new Error('No discount found for passenger type: ' + passengerType);
        const discountAmount = discount.calculateDiscount(originalPrice);
        const finalPrice = discount.getFinalPrice(originalPrice);
        return {
            passengerType: discount.passengerType,
            originalPrice: parseFloat(originalPrice),
            discountAmount,
            finalPrice,
            discountType: discount.discountType,
            discountValue: discount.discountValue,
            isCurrentlyValid: discount.isCurrentlyValid()
        };
    }
}

module.exports = new PassengerDiscountService();
