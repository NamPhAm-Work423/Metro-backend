const express = require('express');
const { 
    createSepayOrder, 
    getSepayOrder,
    checkSepayOrderStatus,
    captureSepayPayment,
    handleSepayWebhook 
} = require('../controllers/sepay.controller');

const router = express.Router();


/**
 * @route POST /v1/payment/sepay/create-order
 * @desc Create a Sepay order
 * @access Public
 */
router.post('/create-order', createSepayOrder);

/**
 * @route POST /v1/payment/sepay/capture/:orderId
 * @desc Capture a Sepay payment
 * @access Public
 */
router.post('/capture/:orderId', captureSepayPayment);

/**
 * @route GET /v1/payment/sepay/order/:orderId
 * @desc Get Sepay order details
 * @access Public
 */
router.get('/order/:orderId', getSepayOrder);

/**
 * @route GET /v1/payment/sepay/check-status/:orderId
 * @desc Check if Sepay order is ready for capture
 * @access Public
 */
router.get('/check-status/:orderId', checkSepayOrderStatus);

/**
 * @route POST /v1/payment/sepay/webhook
 * @desc Handle Sepay webhook events
 * @access Public
 */
router.post('/webhook', handleSepayWebhook);

module.exports = router; 