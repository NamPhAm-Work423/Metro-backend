const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotion.controller');
const { authorizeRoles } = require('../middlewares/authorization');

// Public promotion information (all authenticated users)
router.get('/activePromotions', ...authorizeRoles('passenger', 'staff', 'admin'), promotionController.getActivePromotions);
router.get('/searchPromotions', ...authorizeRoles('passenger', 'staff', 'admin'), promotionController.searchPromotions);

// Promotion validation and application (all authenticated users)
router.post('/validatePromotion/:code', ...authorizeRoles('passenger', 'staff', 'admin'), promotionController.validatePromotion);
router.post('/applyPromotion/:code', ...authorizeRoles('passenger', 'staff', 'admin'), promotionController.applyPromotion);
router.post('/validatePromotionsBulk', ...authorizeRoles('staff', 'admin'), promotionController.validatePromotionsBulk);

// Promotion lookup by code (all authenticated users)
router.get('/getPromotionByCode/:code', ...authorizeRoles('passenger', 'staff', 'admin'), promotionController.getPromotionByCode);

// Administrative operations
router.get('/promotionStatistics', ...authorizeRoles('staff', 'admin'), promotionController.getPromotionStatistics);
router.get('/promotionUsageReport/:id', ...authorizeRoles('staff', 'admin'), promotionController.getPromotionUsageReport);
router.post('/expirePromotions', ...authorizeRoles('admin'), promotionController.expirePromotions);

// CRUD operations
router.get('/allPromotions', ...authorizeRoles('staff', 'admin'), promotionController.getAllPromotions);
router.post('/createPromotion', ...authorizeRoles('admin'), promotionController.createPromotion);
router.get('/getPromotionById/:id', ...authorizeRoles('staff', 'admin'), promotionController.getPromotionById);
router.put('/updatePromotion/:id', ...authorizeRoles('admin'), promotionController.updatePromotion);
router.put('/updatePromotionByCode/:code', ...authorizeRoles('admin'), promotionController.updatePromotionByCode);
router.delete('/deletePromotion/:id', ...authorizeRoles('admin'), promotionController.deletePromotion);

module.exports = router;
