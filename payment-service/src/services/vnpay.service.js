// VNPay integration service using the vnpay Node.js library
// https://github.com/lehuygiang28/vnpay

const { VNPay } = require('vnpay');

// Load config from environment variables for security
const vnpayConfig = {
    tmnCode: process.env.VNPAY_TMN_CODE, // Merchant code
    secureSecret: process.env.VNPAY_SECRET, // Secret key
    vnpayHost: process.env.VNPAY_HOST || 'https://sandbox.vnpayment.vn',
    testMode: process.env.VNPAY_TEST_MODE === 'true',
    hashAlgorithm: process.env.VNPAY_HASH_ALGO || 'SHA512',
    enableLog: process.env.VNPAY_ENABLE_LOG === 'true',
};

const vnpay = new VNPay(vnpayConfig);

/**
 * Build a VNPay payment URL
 * @param {Object} params - Payment parameters (amount, order info, return URL, etc.)
 * @returns {string} - Payment URL for redirect
 */
function buildPaymentUrl(params) {
    // vnp_Amount: amount in VND (multiply by 100 for VNPay)
    // vnp_IpAddr: client IP
    // vnp_ReturnUrl: URL to redirect after payment
    // vnp_TxnRef: unique order ID
    // vnp_OrderInfo: order description
    return vnpay.buildPaymentUrl(params);
}

/**
 * Verify VNPay return URL (after payment)
 * @param {Object} query - The query params from VNPay return
 * @returns {Object} - Verification result { isSuccess, message, ... }
 */
function verifyReturnUrl(query) {
    return vnpay.verifyReturnUrl(query);
}

/**
 * Verify VNPay IPN callback (server-to-server notification)
 * @param {Object} query - The query params from VNPay IPN
 * @returns {Object} - Verification result { isSuccess, message, ... }
 */
function verifyIpnCallback(query) {
    return vnpay.verifyIpnCall(query);
}


module.exports = {
    buildPaymentUrl,
    verifyReturnUrl,
    verifyIpnCallback,
};
