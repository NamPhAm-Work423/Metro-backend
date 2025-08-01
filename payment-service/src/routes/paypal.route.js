const express = require('express');
const { 
    createPaypalOrder, 
    capturePaypalPayment, 
    getPaypalOrder, 
    handlePaypalWebhook 
} = require('../controllers/papal.controller');

const router = express.Router();

/**
 * @route POST /v1/payment/paypal/create-order
 * @desc Create a PayPal order
 * @access Public
 */
router.post('/create-order', createPaypalOrder);

/**
 * @route POST /v1/payment/paypal/capture/:orderId
 * @desc Capture a PayPal payment
 * @access Public
 */
router.post('/capture/:orderId', capturePaypalPayment);

/**
 * @route GET /v1/payment/paypal/order/:orderId
 * @desc Get PayPal order details
 * @access Public
 */
router.get('/order/:orderId', getPaypalOrder);

/**
 * @route POST /v1/payment/paypal/webhook
 * @desc Handle PayPal webhook events
 * @access Public
 */
router.post('/webhook', handlePaypalWebhook);

module.exports = router; 