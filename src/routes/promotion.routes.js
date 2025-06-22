const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotion.controller');
const verifyToken = require('../middlewares/verifyToken');
const { checkRole } = require('../middlewares/role');

// Public routes
router.get('/active', promotionController.getActivePromotions);
router.get('/type/:type', promotionController.getPromotionsByType);
router.post('/validate', promotionController.validatePromotionCode);

// Protected routes - require authentication
router.use(verifyToken);

// User routes
router.post('/apply', promotionController.applyPromotion);

// Admin routes
router.use(checkRole('admin'));
router.post('/', promotionController.createPromotion);
router.get('/', promotionController.getAllPromotions);
router.get('/:id', promotionController.getPromotionById);
router.put('/:id', promotionController.updatePromotion);
router.delete('/:id', promotionController.deletePromotion);
router.get('/:id/stats', promotionController.getPromotionStatistics);

module.exports = router; 