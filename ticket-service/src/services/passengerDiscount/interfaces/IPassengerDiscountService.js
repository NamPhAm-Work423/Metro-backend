class IPassengerDiscountService {
    async getAllPassengerDiscounts() { throw new Error('Not implemented'); }
    async getPassengerDiscountByType(passengerType) { throw new Error('Not implemented'); }
    async createPassengerDiscount(discountData) { throw new Error('Not implemented'); }
    async updatePassengerDiscount(discountId, updateData) { throw new Error('Not implemented'); }
    async deletePassengerDiscount(discountId) { throw new Error('Not implemented'); }
    async calculateDiscount(passengerType, originalPrice) { throw new Error('Not implemented'); }
}

module.exports = IPassengerDiscountService;
