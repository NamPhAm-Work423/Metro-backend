const transitPassService = require('../services/transitPass.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');

class TransitPassController {
  // POST /v1/transitPasses
  createTransitPass = asyncErrorHandler(async (req, res) => {
    const data = req.body;
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

  // PUT /v1/transitPasses/:id
  updateTransitPass = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const pass = await transitPassService.updateTransitPass(id, updateData);
    res.status(200).json({ success: true, message: 'Transit pass updated successfully', data: pass });
  });

  // DELETE /v1/transitPasses/:id
  deleteTransitPass = asyncErrorHandler(async (req, res) => {
    const { id } = req.params;
    await transitPassService.deleteTransitPass(id);
    res.status(200).json({ success: true, message: 'Transit pass deleted successfully' });
  });
}

module.exports = new TransitPassController();


