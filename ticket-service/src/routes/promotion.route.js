const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotion.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Health check endpoint (no auth required)
router.get('/health', promotionController.healthCheck);

// Public promotion information (all authenticated users)
router.get('/active', ...authorizeRoles('passenger', 'staff', 'admin'), promotionController.getActivePromotions);
router.get('/search', ...authorizeRoles('passenger', 'staff', 'admin'), promotionController.searchPromotions);

// Promotion validation and application (all authenticated users)
router.post('/:code/validate', ...authorizeRoles('passenger', 'staff', 'admin'), promotionController.validatePromotion);
router.post('/:code/apply', ...authorizeRoles('passenger', 'staff', 'admin'), promotionController.applyPromotion);
router.post('/validate-bulk', ...authorizeRoles('staff', 'admin'), promotionController.validatePromotionsBulk);

// Promotion lookup by code (all authenticated users)
router.get('/code/:code', ...authorizeRoles('passenger', 'staff', 'admin'), promotionController.getPromotionByCode);

// Administrative operations
router.get('/statistics', ...authorizeRoles('staff', 'admin'), promotionController.getPromotionStatistics);
router.get('/:id/usage-report', ...authorizeRoles('staff', 'admin'), promotionController.getPromotionUsageReport);
router.post('/expire', ...authorizeRoles('admin'), promotionController.expirePromotions);

// CRUD operations
router.get('/', ...authorizeRoles('staff', 'admin'), promotionController.getAllPromotions);
router.post('/', ...authorizeRoles('admin'), promotionController.createPromotion);
router.get('/:id', ...authorizeRoles('staff', 'admin'), promotionController.getPromotionById);
router.put('/:id', ...authorizeRoles('admin'), promotionController.updatePromotion);
router.delete('/:id', ...authorizeRoles('admin'), promotionController.deletePromotion);

module.exports = router;
