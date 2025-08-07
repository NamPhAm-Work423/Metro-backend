const { PassengerDiscount } = require('../../../models/index.model');

class PassengerDiscountRepository {
    async findAll() {
        return PassengerDiscount.findAll({ order: [['passengerType', 'ASC']] });
    }
    async findByType(passengerType) {
        return PassengerDiscount.findOne({ where: { passengerType: passengerType.toLowerCase() } });
    }
    async create(discountData) {
        return PassengerDiscount.create(discountData);
    }
    async update(discountId, updateData) {
        const discount = await PassengerDiscount.findByPk(discountId);
        if (!discount) return null;
        return discount.update(updateData);
    }
    async delete(discountId) {
        const discount = await PassengerDiscount.findByPk(discountId);
        if (!discount) return null;
        await discount.destroy();
        return true;
    }
}

module.exports = new PassengerDiscountRepository();
