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

  async create(transitPassData) {
    return TransitPass.create(transitPassData);
  }

  async update(transitPassId, updateData) {
    const pass = await TransitPass.findByPk(transitPassId);
    if (!pass) return null;
    return pass.update(updateData);
  }

  async delete(transitPassId) {
    const pass = await TransitPass.findByPk(transitPassId);
    if (!pass) return null;
    await pass.destroy();
    return true;
  }
}

module.exports = new TransitPassRepository();


