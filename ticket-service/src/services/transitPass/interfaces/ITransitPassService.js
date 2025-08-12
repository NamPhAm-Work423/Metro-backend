class ITransitPassService {
  async getAllTransitPasses() { throw new Error('Not implemented'); }
  async getActiveTransitPasses() { throw new Error('Not implemented'); }
  async getTransitPassById(transitPassId) { throw new Error('Not implemented'); }
  async getTransitPassByType(transitPassType) { throw new Error('Not implemented'); }
  async createTransitPass(transitPassData) { throw new Error('Not implemented'); }
  async updateTransitPass(transitPassId, updateData) { throw new Error('Not implemented'); }
  async deleteTransitPass(transitPassId) { throw new Error('Not implemented'); }
}

module.exports = ITransitPassService;


