const express = require('express');
const { 
    initiateVnpayPayment, 
    handleVnpayReturn, 
    handleVnpayIpn 
} = require('../controllers/payment.controller');

const router = express.Router();

/**
 * @route POST /v1/payment/vnpay
 * @desc Initiate a VNPay payment
 * @access Public
 */
router.post('/', initiateVnpayPayment);

/**
 * @route GET /v1/payment/vnpay/return
 * @desc Handle VNPay return URL (user redirected after payment)
 * @access Public
 */
router.get('/return', handleVnpayReturn);

/**
 * @route POST /v1/payment/vnpay/ipn
 * @desc Handle VNPay IPN callback (server-to-server notification)
 * @access Public
 */
router.post('/ipn', handleVnpayIpn);

module.exports = router; 