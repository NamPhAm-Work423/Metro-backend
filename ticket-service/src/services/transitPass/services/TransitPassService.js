const ITransitPassService = require('../interfaces/ITransitPassService');
const { logger } = require('../../../config/logger');
const TransitPassRepository = require('../repositories/TransitPassRepository');
const {
  publishTransitPassCreated,
  publishTransitPassUpdated,
  publishTransitPassDeleted
} = require('../../../events/transisPass.producer.event');

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

  async getTransitPassesByCurrency(currency) {
    return TransitPassRepository.findByCurrency(currency);
  }

  async createTransitPass(transitPassData) {
    //check if transitPassType is exists, warn if it does
    const existing = await TransitPassRepository.findByType(transitPassData.transitPassType);
    if (existing) {
      logger.warn('Transit pass type already exists', { transitPassType: transitPassData.transitPassType });
      return existing;
    }
    const created = await TransitPassRepository.create(transitPassData);
    publishTransitPassCreated(created);
    return created;
  }

  async updateTransitPass(transitPassId, updateData) {
    const updated = await TransitPassRepository.update(transitPassId, updateData);
    if (!updated) throw new Error('Transit pass not found');
    publishTransitPassUpdated(updated);
    return updated;
  }

  async deleteTransitPass(transitPassId) {
    const deleted = await TransitPassRepository.delete(transitPassId);
    if (!deleted) throw new Error('Transit pass not found');
    publishTransitPassDeleted(transitPassId);
    return true;
  }

  async setTransitPassActive(transitPassId, isActive) {
    const updated = await TransitPassRepository.setActive(transitPassId, isActive);
    if (!updated) throw new Error('Transit pass not found');
    publishTransitPassUpdated(updated);
    return updated;
  }

  async bulkUpdateTransitPasses(filters, updateData) {
    const updatedCount = await TransitPassRepository.bulkUpdate(filters, updateData);
    return { updatedCount };
  }
}

module.exports = new TransitPassService();


