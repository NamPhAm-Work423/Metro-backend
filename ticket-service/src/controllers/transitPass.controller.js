const transitPassService = require('../services/transitPass.service');
const validator = require('../services/transitPass/services/TransitPassValidator');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const { logger } = require('../config/logger');

class TransitPassController {
  // POST /v1/transitPasses 
  createTransitPass = asyncErrorHandler(async (req, res, next) => {
    try {
      const data = req.body;
      validator.validateCreate(data);
      const pass = await transitPassService.createTransitPass(data);
      return res.status(200).json({ 
        success: true, 
        message: 'Transit pass created successfully', 
        data: pass 
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
        error: 'INTERNAL_ERROR_CREATE_TRANSIT_PASS'
      });
    }
  });

  // GET /v1/transitPasses
  getAllTransitPasses = asyncErrorHandler(async (req, res, next) => {
    try {
      const passes = await transitPassService.getAllTransitPasses();
      return res.status(200).json({ 
        success: true, 
        message: 'Transit passes retrieved successfully', 
        data: passes, 
        count: passes.length 
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
        error: 'INTERNAL_ERROR_GET_ALL_TRANSIT_PASSES'
      });
    }
  });

  // GET /v1/transitPasses/active
  getActiveTransitPasses = asyncErrorHandler(async (req, res, next) => {
    try {
      const passes = await transitPassService.getActiveTransitPasses();
      return res.status(200).json({ 
        success: true, 
        message: 'Active transit passes retrieved successfully', 
        data: passes, 
        count: passes.length 
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
        error: 'INTERNAL_ERROR_GET_ACTIVE_TRANSIT_PASSES'
      });
    }
  });

  // GET /v1/transitPasses/:id
  getTransitPassById = asyncErrorHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const pass = await transitPassService.getTransitPassById(id);
      if (!pass) return res.status(404).json({ success: false, message: 'Transit pass not found' });
      return res.status(200).json({ 
        success: true, 
        message: 'Transit pass retrieved successfully', 
        data: pass 
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
        error: 'INTERNAL_ERROR_GET_TRANSIT_PASS_BY_ID'
      });
    }
  });

  // GET /v1/transitPasses/type/:transitPassType
  getTransitPassByType = asyncErrorHandler(async (req, res, next) => {
    try {
      const { transitPassType } = req.params;
      const pass = await transitPassService.getTransitPassByType(transitPassType);
      if (!pass) return res.status(404).json({ success: false, message: 'Transit pass type not found' });
      return res.status(200).json({ 
        success: true, 
        message: 'Transit pass retrieved successfully', 
        data: pass 
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
        error: 'INTERNAL_ERROR_GET_TRANSIT_PASS_BY_TYPE'
      });
    }
  });

  // GET /v1/transitPasses/currency/:currency
  getTransitPassesByCurrency = asyncErrorHandler(async (req, res, next) => {
    try {
      const { currency } = req.params;
      const passes = await transitPassService.getTransitPassesByCurrency(currency);
      return res.status(200).json({ 
        success: true, 
        message: 'Transit passes retrieved successfully', 
        data: passes, 
        count: passes.length 
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
        error: 'INTERNAL_ERROR_GET_TRANSIT_PASSES_BY_CURRENCY'
      });
    }
  });

  // PUT /v1/transitPasses/:id
  updateTransitPass = asyncErrorHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      validator.validateUpdate(updateData);
      const pass = await transitPassService.updateTransitPass(id, updateData);
      return res.status(200).json({ 
        success: true, 
        message: 'Transit pass updated successfully', 
        data: pass 
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
        error: 'INTERNAL_ERROR_UPDATE_TRANSIT_PASS'
      });
    }
  });

  // DELETE /v1/transitPasses/:id
  deleteTransitPass = asyncErrorHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      await transitPassService.deleteTransitPass(id);
      return res.status(200).json({ 
        success: true, 
        message: 'Transit pass deleted successfully' 
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
        error: 'INTERNAL_ERROR_DELETE_TRANSIT_PASS'
      });
    }
  });

  // PUT /v1/transitPasses/:id/active
  setTransitPassActive = asyncErrorHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const pass = await transitPassService.setTransitPassActive(id, !!isActive);
      return res.status(200).json({ 
        success: true, 
        message: 'Transit pass status updated successfully', 
        data: pass 
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
        error: 'INTERNAL_ERROR_SET_TRANSIT_PASS_ACTIVE'
      });
    }
  });

  // PUT /v1/transitPasses/bulk-update
  bulkUpdateTransitPasses = asyncErrorHandler(async (req, res, next) => {
    try {
      const { filters, updateData } = req.body;
      if (!filters || !updateData) {
        return res.status(400).json({ success: false, message: 'Both filters and updateData are required' });
      }
      const result = await transitPassService.bulkUpdateTransitPasses(filters, updateData);
      return res.status(200).json({ 
        success: true, 
        message: 'Bulk transit pass update completed', 
        data: result 
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
        error: 'INTERNAL_ERROR_BULK_UPDATE_TRANSIT_PASSES'
      });
    }
  });
}

module.exports = new TransitPassController();


