const express = require('express');
const router = express.Router();
const paymentGatewayController = require('../controllers/paymentGateway.controller');
const verifyToken = require('../middlewares/verifyToken');
const { checkRole } = require('../middlewares/role');

// Protected routes - require authentication
router.use(verifyToken);

// User routes
router.post('/initialize', paymentGatewayController.initializePayment);
router.post('/process', paymentGatewayController.processPayment);
router.get('/:paymentId/verify', paymentGatewayController.verifyPayment);
router.get('/:paymentId/status', paymentGatewayController.getPaymentStatus);
router.get('/methods', paymentGatewayController.getAvailablePaymentMethods);
router.post('/validate-method', paymentGatewayController.validatePaymentMethod);

// Admin routes
router.use(checkRole('admin'));
router.post('/webhook', paymentGatewayController.handleWebhook);
router.get('/transactions', paymentGatewayController.getTransactionHistory);
router.put('/settings', paymentGatewayController.updatePaymentGatewaySettings);

module.exports = router; 