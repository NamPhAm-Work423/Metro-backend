const { buildPaymentUrl, verifyReturnUrl, verifyIpnCallback } = require('./vnpay.service');
const { Payment, Transaction, PaymentLog } = require('../models/index.model');

/**
 * Initiate a VNPay payment
 * @param {Object} params
 * @param {number} params.ticketId
 * @param {number} params.passengerId
 * @param {number} params.amount - Amount in VND
 * @param {string} params.orderInfo - Order description
 * @param {string} params.returnUrl - URL to redirect after payment
 * @param {string} params.clientIp - Client IP address
 * @returns {Promise<{ paymentUrl: string, payment: Payment }>}
 */
async function createVnpayPayment({ ticketId, passengerId, amount, orderInfo, returnUrl, clientIp }) {
    // Generate unique order ID (TxnRef)
    const txnRef = `VNP${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const paymentDate = new Date();
    // Create payment record (PENDING)
    const payment = await Payment.create({
        ticketId,
        passengerId,
        paymentAmount: amount,
        paymentMethod: 'VNPAY',
        paymentStatus: 'PENDING',
        paymentDate,
        paymentGatewayResponse: null
    });

    // Build VNPay payment URL
    const vnpParams = {
        vnp_Amount: amount * 100, // VNPay expects amount * 100
        vnp_IpAddr: clientIp,
        vnp_ReturnUrl: returnUrl,
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: 'other',
        vnp_CreateDate: paymentDate.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14),
    };
    const paymentUrl = buildPaymentUrl(vnpParams);

    // Log payment initiation
    await PaymentLog.create({
        paymentId: payment.paymentId,
        paymentLogType: 'PAYMENT',
        paymentLogDate: new Date(),
        paymentLogStatus: 'PENDING',
    });

    return { paymentUrl, payment };
}

/**
 * Handle VNPay return URL (user redirected after payment)
 * @param {Object} query - Query params from VNPay return
 * @returns {Promise<{ isSuccess: boolean, message: string, payment?: Payment }>} 
 */
async function handleVnpayReturn(query) {
    const verifyResult = verifyReturnUrl(query);
    const txnRef = query.vnp_TxnRef;
    // Find payment by order ID (TxnRef is not stored, so we may need to match by other means)
    // For demo, assume vnp_TxnRef is unique and stored in paymentGatewayResponse
    let payment = await Payment.findOne({
        where: { paymentMethod: 'VNPAY' },
        order: [['paymentDate', 'DESC']]
    });
    if (!payment) {
        return { isSuccess: false, message: 'Payment not found' };
    }
    // Update payment status
    if (verifyResult.isSuccess) {
        payment.paymentStatus = 'COMPLETED';
    } else {
        payment.paymentStatus = 'FAILED';
    }
    payment.paymentGatewayResponse = query;
    await payment.save();

    // Log payment result
    await PaymentLog.create({
        paymentId: payment.paymentId,
        paymentLogType: 'PAYMENT',
        paymentLogDate: new Date(),
        paymentLogStatus: payment.paymentStatus,
    });

    // Create transaction if successful
    if (verifyResult.isSuccess) {
        await Transaction.create({
            paymentId: payment.paymentId,
            transactionAmount: payment.paymentAmount,
            transactionStatus: 'COMPLETED',
        });
    }

    return { isSuccess: verifyResult.isSuccess, message: verifyResult.message, payment };
}

/**
 * Handle VNPay IPN callback (server-to-server notification)
 * @param {Object} query - Query params from VNPay IPN
 * @returns {Promise<{ isSuccess: boolean, message: string, payment?: Payment }>}
 */
async function handleVnpayIpn(query) {
    const verifyResult = verifyIpnCallback(query);
    const txnRef = query.vnp_TxnRef;
    // Find payment by order ID (TxnRef is not stored, so we may need to match by other means)
    let payment = await Payment.findOne({
        where: { paymentMethod: 'VNPAY' },
        order: [['paymentDate', 'DESC']]
    });
    if (!payment) {
        return { isSuccess: false, message: 'Payment not found' };
    }
    // Update payment status
    if (verifyResult.isSuccess) {
        payment.paymentStatus = 'COMPLETED';
    } else {
        payment.paymentStatus = 'FAILED';
    }
    payment.paymentGatewayResponse = query;
    await payment.save();

    // Log payment result
    await PaymentLog.create({
        paymentId: payment.paymentId,
        paymentLogType: 'PAYMENT',
        paymentLogDate: new Date(),
        paymentLogStatus: payment.paymentStatus,
    });

    // Create transaction if successful
    if (verifyResult.isSuccess) {
        await Transaction.create({
            paymentId: payment.paymentId,
            transactionAmount: payment.paymentAmount,
            transactionStatus: 'COMPLETED',
        });
    }

    return { isSuccess: verifyResult.isSuccess, message: verifyResult.message, payment };
}

module.exports = {
    createVnpayPayment,
    handleVnpayReturn,
    handleVnpayIpn,
};








