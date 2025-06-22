const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const verifyToken = require('../middlewares/verifyToken');
const { checkRole } = require('../middlewares/role');

// Protected routes - require authentication
router.use(verifyToken);

// User routes
router.post('/', paymentController.createPayment);
router.get('/:id', paymentController.getPaymentById);
router.post('/:id/process', paymentController.processPayment);
router.post('/:id/refund', paymentController.refundPayment);
router.get('/:id/validate', paymentController.validatePayment);
router.get('/:id/receipt', paymentController.getPaymentReceipt);
router.get('/methods', paymentController.getPaymentMethods);
router.get('/history/:userId', paymentController.getPaymentHistory);

// Admin routes
router.use(checkRole('admin'));
router.get('/', paymentController.getAllPayments);
router.put('/:id/status', paymentController.updatePaymentStatus);

module.exports = router; 