const { TransitPass } = require('../../../models/index.model');

class TransitPassRepository {
  async findAll() {
    return TransitPass.findAll({ order: [['transitPassType', 'ASC']] });
  }

  async findActive() {
    return TransitPass.findAll({ where: { isActive: true }, order: [['transitPassType', 'ASC']] });
  }

  async findById(transitPassId) {
    return TransitPass.findByPk(transitPassId);
  }

  async findByType(transitPassType) {
    return TransitPass.findOne({ where: { transitPassType } });
  }

  async findByCurrency(currency) {
    return TransitPass.findAll({ where: { currency }, order: [['transitPassType', 'ASC']] });
  }

  async create(transitPassData) {
    return TransitPass.create(transitPassData);
  }

  async update(transitPassId, updateData) {
    const pass = await TransitPass.findByPk(transitPassId);
    if (!pass) return null;
    return pass.update(updateData);
  }

  async setActive(transitPassId, isActive) {
    const pass = await TransitPass.findByPk(transitPassId);
    if (!pass) return null;
    return pass.update({ isActive });
  }

  async bulkUpdate(filters = {}, updateData = {}) {
    const { currency, isActive, transitPassType } = filters;
    const where = {};
    if (currency) where.currency = currency;
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (transitPassType) where.transitPassType = transitPassType;
    const [count] = await TransitPass.update(updateData, { where });
    return count;
  }

  async delete(transitPassId) {
    const pass = await TransitPass.findByPk(transitPassId);
    if (!pass) return null;
    await pass.destroy();
    return true;
  }
}

module.exports = new TransitPassRepository();


