const transitPassService = require('../services/transitPass.service');
const validator = require('../services/transitPass/services/TransitPassValidator');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const { logger } = require('../config/logger');
const { addCustomSpan } = require('../tracing');

class TransitPassController {
  // POST /v1/transitPasses 
  createTransitPass = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('transitPass.create', async (span) => {
      const data = req.body;
      span.setAttributes({
        'operation.type': 'create',
        'operation.entity': 'transit_pass',
        'request.authenticated': !!req.user,
        'user.id': req.user?.id || 'unknown'
      });

      try {
        logger.traceInfo('Creating transit pass', { requestedBy: req.user?.id });
        validator.validateCreate(data);
        const pass = await addCustomSpan('transitPass.service.create', async (serviceSpan) => {
          serviceSpan.setAttributes({ 'service.operation': 'create_transit_pass' });
          return transitPassService.createTransitPass(data);
        });
        span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
        return res.status(200).json({ 
          success: true, 
          message: 'Transit pass created successfully', 
          data: pass 
        });
      } catch (error) {
        span.recordException(error);
        span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
        logger.traceError('Failed to create transit pass', error);
        return res.status(500).json({
          success: false,
          message: error.message,
          error: 'INTERNAL_ERROR_CREATE_TRANSIT_PASS'
        });
      }
    });
  });

  // GET /v1/transitPasses
  getAllTransitPasses = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('transitPass.get-all', async (span) => {
      span.setAttributes({
        'operation.type': 'read',
        'operation.entity': 'transit_pass',
        'operation.scope': 'all'
      });
      try {
        const passes = await addCustomSpan('transitPass.service.get-all', async () => transitPassService.getAllTransitPasses());
        span.setAttributes({ 'operation.success': true, 'items.count': passes.length, 'http.status_code': 200 });
        return res.status(200).json({ 
          success: true, 
          message: 'Transit passes retrieved successfully', 
          data: passes, 
          count: passes.length 
        });
      } catch (error) {
        span.recordException(error);
        span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
        return res.status(500).json({
          success: false,
          message: error.message,
          error: 'INTERNAL_ERROR_GET_ALL_TRANSIT_PASSES'
        });
      }
    });
  });

  // GET /v1/transitPasses/active
  getActiveTransitPasses = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('transitPass.get-active', async (span) => {
      span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'transit_pass', 'operation.scope': 'active' });
      try {
        const passes = await addCustomSpan('transitPass.service.get-active', async () => transitPassService.getActiveTransitPasses());
        span.setAttributes({ 'operation.success': true, 'items.count': passes.length, 'http.status_code': 200 });
        return res.status(200).json({ 
          success: true, 
          message: 'Active transit passes retrieved successfully', 
          data: passes, 
          count: passes.length 
        });
      } catch (error) {
        span.recordException(error);
        span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
        return res.status(500).json({
          success: false,
          message: error.message,
          error: 'INTERNAL_ERROR_GET_ACTIVE_TRANSIT_PASSES'
        });
      }
    });
  });

  // GET /v1/transitPasses/:id
  getTransitPassById = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('transitPass.get-by-id', async (span) => {
      const { id } = req.params;
      span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'transit_pass', 'transitPass.id': id });
      try {
        const pass = await addCustomSpan('transitPass.service.get-by-id', async () => transitPassService.getTransitPassById(id));
        if (!pass) {
          span.setAttributes({ 'operation.success': false, 'http.status_code': 404 });
          return res.status(404).json({ success: false, message: 'Transit pass not found' });
        }
        span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
        return res.status(200).json({ 
          success: true, 
          message: 'Transit pass retrieved successfully', 
          data: pass 
        });
      } catch (error) {
        span.recordException(error);
        span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
        return res.status(500).json({
          success: false,
          message: error.message,
          error: 'INTERNAL_ERROR_GET_TRANSIT_PASS_BY_ID'
        });
      }
    });
  });

  // GET /v1/transitPasses/type/:transitPassType
  getTransitPassByType = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('transitPass.get-by-type', async (span) => {
      const { transitPassType } = req.params;
      span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'transit_pass', 'transitPass.type': transitPassType });
      try {
        const pass = await addCustomSpan('transitPass.service.get-by-type', async () => transitPassService.getTransitPassByType(transitPassType));
        if (!pass) {
          span.setAttributes({ 'operation.success': false, 'http.status_code': 404 });
          return res.status(404).json({ success: false, message: 'Transit pass type not found' });
        }
        span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
        return res.status(200).json({ 
          success: true, 
          message: 'Transit pass retrieved successfully', 
          data: pass 
        });
      } catch (error) {
        span.recordException(error);
        span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
        return res.status(500).json({
          success: false,
          message: error.message,
          error: 'INTERNAL_ERROR_GET_TRANSIT_PASS_BY_TYPE'
        });
      }
    });
  });

  // GET /v1/transitPasses/currency/:currency
  getTransitPassesByCurrency = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('transitPass.get-by-currency', async (span) => {
      const { currency } = req.params;
      span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'transit_pass', 'currency': currency });
      try {
        const passes = await addCustomSpan('transitPass.service.get-by-currency', async () => transitPassService.getTransitPassesByCurrency(currency));
        span.setAttributes({ 'operation.success': true, 'items.count': passes.length, 'http.status_code': 200 });
        return res.status(200).json({ 
          success: true, 
          message: 'Transit passes retrieved successfully', 
          data: passes, 
          count: passes.length 
        });
      } catch (error) {
        span.recordException(error);
        span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
        return res.status(500).json({
          success: false,
          message: error.message,
          error: 'INTERNAL_ERROR_GET_TRANSIT_PASSES_BY_CURRENCY'
        });
      }
    });
  });

  // PUT /v1/transitPasses/:id
  updateTransitPass = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('transitPass.update', async (span) => {
      const { id } = req.params;
      const updateData = req.body;
      span.setAttributes({ 'operation.type': 'update', 'operation.entity': 'transit_pass', 'transitPass.id': id });
      try {
        validator.validateUpdate(updateData);
        const pass = await addCustomSpan('transitPass.service.update', async () => transitPassService.updateTransitPass(id, updateData));
        span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
        return res.status(200).json({ 
          success: true, 
          message: 'Transit pass updated successfully', 
          data: pass 
        });
      } catch (error) {
        span.recordException(error);
        span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
        return res.status(500).json({
          success: false,
          message: error.message,
          error: 'INTERNAL_ERROR_UPDATE_TRANSIT_PASS'
        });
      }
    });
  });

  // DELETE /v1/transitPasses/:id
  deleteTransitPass = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('transitPass.delete', async (span) => {
      const { id } = req.params;
      span.setAttributes({ 'operation.type': 'delete', 'operation.entity': 'transit_pass', 'transitPass.id': id });
      try {
        await addCustomSpan('transitPass.service.delete', async () => transitPassService.deleteTransitPass(id));
        span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
        return res.status(200).json({ 
          success: true, 
          message: 'Transit pass deleted successfully' 
        });
      } catch (error) {
        span.recordException(error);
        span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
        return res.status(500).json({
          success: false,
          message: error.message,
          error: 'INTERNAL_ERROR_DELETE_TRANSIT_PASS'
        });
      }
    });
  });

  // PUT /v1/transitPasses/:id/active
  setTransitPassActive = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('transitPass.set-active', async (span) => {
      const { id } = req.params;
      const { isActive } = req.body;
      span.setAttributes({ 'operation.type': 'update', 'operation.entity': 'transit_pass', 'transitPass.id': id, 'transitPass.is_active': !!isActive });
      try {
        const pass = await addCustomSpan('transitPass.service.set-active', async () => transitPassService.setTransitPassActive(id, !!isActive));
        span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
        return res.status(200).json({ 
          success: true, 
          message: 'Transit pass status updated successfully', 
          data: pass 
        });
      } catch (error) {
        span.recordException(error);
        span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
        return res.status(500).json({
          success: false,
          message: error.message,
          error: 'INTERNAL_ERROR_SET_TRANSIT_PASS_ACTIVE'
        });
      }
    });
  });

  // PUT /v1/transitPasses/bulk-update
  bulkUpdateTransitPasses = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('transitPass.bulk-update', async (span) => {
      const { filters, updateData } = req.body;
      span.setAttributes({ 'operation.type': 'update', 'operation.entity': 'transit_pass', 'operation.scope': 'bulk' });
      try {
        if (!filters || !updateData) {
          span.setAttributes({ 'operation.success': false, 'http.status_code': 400 });
          return res.status(400).json({ success: false, message: 'Both filters and updateData are required' });
        }
        const result = await addCustomSpan('transitPass.service.bulk-update', async () => transitPassService.bulkUpdateTransitPasses(filters, updateData));
        span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
        return res.status(200).json({ 
          success: true, 
          message: 'Bulk transit pass update completed', 
          data: result 
        });
      } catch (error) {
        span.recordException(error);
        span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
        return res.status(500).json({
          success: false,
          message: error.message,
          error: 'INTERNAL_ERROR_BULK_UPDATE_TRANSIT_PASSES'
        });
      }
    });
  });
}

module.exports = new TransitPassController();


