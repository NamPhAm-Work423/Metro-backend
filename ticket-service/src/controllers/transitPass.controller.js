const transitPassService = require('../services/transitPass.service');
const validator = require('../services/transitPass/services/TransitPassValidator');
const asyncErrorHandler = require('../helpers/errorHandler.helper');

class TransitPassController {
  // POST /v1/transitPasses
  createTransitPass = asyncErrorHandler(async (req, res) => {
    const data = req.body;
    validator.validateCreate(data);
    const pass = await transitPassService.createTransitPass(data);
    res.status(201).json({ success: true, message: 'Transit pass created successfully', data: pass });
  });

  // GET /v1/transitPasses
  getAllTransitPasses = asyncErrorHandler(async (req, res) => {
    const passes = await transitPassService.getAllTransitPasses();
    res.status(200).json({ success: true, message: 'Transit passes retrieved successfully', data: passes, count: passes.length });
  });

  // GET /v1/transitPasses/active
  getActiveTransitPasses = asyncErrorHandler(async (req, res) => {
    const passes = await transitPassService.getActiveTransitPasses();
    res.status(200).json({ success: true, message: 'Active transit passes retrieved successfully', data: passes, count: passes.length });
  });

  // GET /v1/transitPasses/:id
  getTransitPassById = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const pass = await transitPassService.getTransitPassById(id);
    if (!pass) return res.status(404).json({ success: false, message: 'Transit pass not found' });
    res.status(200).json({ success: true, message: 'Transit pass retrieved successfully', data: pass });
  });

  // GET /v1/transitPasses/type/:transitPassType
  getTransitPassByType = asyncErrorHandler(async (req, res) => {
    const { transitPassType } = req.params;
    const pass = await transitPassService.getTransitPassByType(transitPassType);
    if (!pass) return res.status(404).json({ success: false, message: 'Transit pass type not found' });
    res.status(200).json({ success: true, message: 'Transit pass retrieved successfully', data: pass });
  });

  // GET /v1/transitPasses/currency/:currency
  getTransitPassesByCurrency = asyncErrorHandler(async (req, res) => {
    const { currency } = req.params;
    const passes = await transitPassService.getTransitPassesByCurrency(currency);
    res.status(200).json({ success: true, message: 'Transit passes retrieved successfully', data: passes, count: passes.length });
  });

  // PUT /v1/transitPasses/:id
  updateTransitPass = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    validator.validateUpdate(updateData);
    const pass = await transitPassService.updateTransitPass(id, updateData);
    res.status(200).json({ success: true, message: 'Transit pass updated successfully', data: pass });
  });

  // DELETE /v1/transitPasses/:id
  deleteTransitPass = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    await transitPassService.deleteTransitPass(id);
    res.status(200).json({ success: true, message: 'Transit pass deleted successfully' });
  });

  // PUT /v1/transitPasses/:id/active
  setTransitPassActive = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const pass = await transitPassService.setTransitPassActive(id, !!isActive);
    res.status(200).json({ success: true, message: 'Transit pass status updated successfully', data: pass });
  });

  // PUT /v1/transitPasses/bulk-update
  bulkUpdateTransitPasses = asyncErrorHandler(async (req, res) => {
    const { filters, updateData } = req.body;
    if (!filters || !updateData) {
      return res.status(400).json({ success: false, message: 'Both filters and updateData are required' });
    }
    const result = await transitPassService.bulkUpdateTransitPasses(filters, updateData);
    res.status(200).json({ success: true, message: 'Bulk transit pass update completed', data: result });
  });
}

module.exports = new TransitPassController();


