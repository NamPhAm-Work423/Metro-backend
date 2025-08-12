const ITransitPassService = require('../interfaces/ITransitPassService');
const TransitPassRepository = require('../repositories/TransitPassRepository');

class TransitPassService extends ITransitPassService {
  async getAllTransitPasses() {
    return TransitPassRepository.findAll();
  }

  async getActiveTransitPasses() {
    return TransitPassRepository.findActive();
  }

  async getTransitPassById(transitPassId) {
    return TransitPassRepository.findById(transitPassId);
  }

  async getTransitPassByType(transitPassType) {
    return TransitPassRepository.findByType(transitPassType);
  }

  async createTransitPass(transitPassData) {
    const existing = await TransitPassRepository.findByType(transitPassData.transitPassType);
    if (existing) throw new Error('Transit pass type already exists');
    return TransitPassRepository.create(transitPassData);
  }

  async updateTransitPass(transitPassId, updateData) {
    const updated = await TransitPassRepository.update(transitPassId, updateData);
    if (!updated) throw new Error('Transit pass not found');
    return updated;
  }

  async deleteTransitPass(transitPassId) {
    const deleted = await TransitPassRepository.delete(transitPassId);
    if (!deleted) throw new Error('Transit pass not found');
    return true;
  }
}

module.exports = new TransitPassService();


