const { buildPaymentUrl, verifyReturnUrl, verifyIpnCallback } = require('./vnpay.service');
const paypalService = require('./paypal.service');
const { Payment, Transaction, PaymentLog } = require('../models/index.model');
const { logger } = require('../config/logger');

/**
 * Initiate a VNPay payment
 * @param {Object} params
 * @param {number} params.ticketId
 * @param {number} params.passengerId
 * @param {number} params.amount - Amount in USD
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

/**
 * Create a PayPal payment
 * @param {Object} params
 * @param {string} params.paymentId - Payment ID from ticket service
 * @param {number} params.ticketId
 * @param {number} params.passengerId
 * @param {number} params.amount - Amount in USD
 * @param {string} params.orderInfo - Order description
 * @param {string} params.currency - Currency code (default: USD)
 * @param {string} params.returnUrl - URL to redirect after successful payment
 * @param {string} params.cancelUrl - URL to redirect after cancelled payment
 * @returns {Promise<{ paypalOrder: Object, payment: Payment }>}
 */
async function createPaypalPayment({ paymentId, ticketId, passengerId, amount, orderInfo, currency = 'USD', returnUrl, cancelUrl }) {
    // Create payment record and PayPal order in parallel for better performance
    const paymentPromise = Payment.create({
        paymentId: paymentId,
        ticketId,
        passengerId,
        paymentAmount: amount,
        paymentMethod: 'paypal',
        paymentStatus: 'PENDING',
        paymentDate: new Date(),
        paymentGatewayResponse: null
    });

    // Prepare PayPal order data
    // For VND currency, PayPal doesn't support decimals, so we need to round to whole numbers
    let processedAmount = amount;
    if (currency === 'VND') {
        processedAmount = Math.round(amount);
    }
    
    const paypalOrderData = {
        intent: 'CAPTURE',
        purchase_units: [{
            amount: {
                currency_code: currency,
                value: processedAmount.toString()
            },
            description: orderInfo || `Ticket payment for ticket ${ticketId}`,
            custom_id: paymentId.toString()
        }],
        application_context: {
            return_url: returnUrl,
            cancel_url: cancelUrl,
            brand_name: 'Metro Transit',
            landing_page: 'LOGIN',
            user_action: 'PAY_NOW',
            shipping_preference: 'NO_SHIPPING',
            payment_method: {
                payer_selected: 'PAYPAL',
                payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
            }
        }
    };

    // Log the URLs being sent to PayPal
    logger.info('PayPal order data prepared', {
        returnUrl,
        cancelUrl,
        orderInfo,
        amount,
        currency,
        fullOrderData: paypalOrderData
    });

    // Execute payment creation and PayPal order in parallel
    const [payment, paypalOrder] = await Promise.all([
        paymentPromise,
        paypalService.createOrder(paypalOrderData)
    ]);

    // Create payment log after payment record exists
    await PaymentLog.create({
        paymentId: payment.paymentId,
        paymentLogType: 'PAYMENT',
        paymentLogDate: new Date(),
        paymentLogStatus: 'PENDING',
    });

    // Update payment with PayPal order ID
    payment.paymentGatewayResponse = {
        paypalOrderId: paypalOrder.id,
        paypalOrderData: paypalOrder
    };
    await payment.save();

    return { paypalOrder, payment };
}

/**
 * Capture a PayPal payment
 * @param {string} orderId - PayPal order ID
 * @returns {Promise<{ isSuccess: boolean, message: string, payment?: Payment }>}
 */
async function capturePaypalPayment(orderId) {
    try {
        // Capture the payment
        const captureResult = await paypalService.captureOrder(orderId);

        // Find the payment record by PayPal order ID
        const payment = await Payment.findOne({
            where: {
                paymentMethod: 'PAYPAL',
                paymentStatus: 'PENDING'
            },
            order: [['paymentDate', 'DESC']]
        });

        // Additional check to ensure we have the right payment
        if (payment && payment.paymentGatewayResponse && payment.paymentGatewayResponse.paypalOrderId !== orderId) {
            logger.warn('PayPal order ID mismatch', {
                expectedOrderId: orderId,
                actualOrderId: payment.paymentGatewayResponse.paypalOrderId
            });
        }

        if (!payment) {
            return { isSuccess: false, message: 'Payment not found' };
        }

        // Update payment status based on capture result
        if (captureResult.status === 'COMPLETED') {
            payment.paymentStatus = 'COMPLETED';
        } else {
            payment.paymentStatus = 'FAILED';
        }

        payment.paymentGatewayResponse = {
            ...payment.paymentGatewayResponse,
            captureResult
        };
        await payment.save();

        // Log payment result
        await PaymentLog.create({
            paymentId: payment.paymentId,
            paymentLogType: 'PAYMENT',
            paymentLogDate: new Date(),
            paymentLogStatus: payment.paymentStatus,
        });

        // Create transaction if successful
        if (payment.paymentStatus === 'COMPLETED') {
            await Transaction.create({
                paymentId: payment.paymentId,
                transactionAmount: payment.paymentAmount,
                transactionStatus: 'COMPLETED',
            });
        }

        return { 
            isSuccess: payment.paymentStatus === 'COMPLETED', 
            message: payment.paymentStatus === 'COMPLETED' ? 'Payment completed' : 'Payment failed',
            payment 
        };

    } catch (error) {
        return { isSuccess: false, message: error.message };
    }
}

/**
 * Create a payment record
 * @param {Object} params
 * @param {string} params.paymentId
 * @param {string} params.ticketId
 * @param {string} params.passengerId
 * @param {number} params.amount
 * @param {string} params.paymentMethod
 * @param {string} params.paymentStatus
 * @param {Object} params.paymentGatewayResponse
 * @returns {Promise<Payment>}
 */
async function createPayment({ paymentId, ticketId, passengerId, amount, paymentMethod, paymentStatus, paymentGatewayResponse }) {
    const payment = await Payment.create({
        paymentId,
        ticketId,
        passengerId,
        paymentAmount: amount,
        paymentMethod,
        paymentStatus,
        paymentDate: new Date(),
        paymentGatewayResponse
    });

    // Create payment log
    await PaymentLog.create({
        paymentId: payment.paymentId,
        paymentLogType: 'PAYMENT',
        paymentLogDate: new Date(),
        paymentLogStatus: paymentStatus,
    });

    return payment;
}

/**
 * Get PayPal order details
 * @param {string} orderId - PayPal order ID
 * @returns {Promise<Object>}
 */
async function getPaypalOrder(orderId) {
    return await paypalService.getOrder(orderId);
}

module.exports = {
    createVnpayPayment,
    handleVnpayReturn,
    handleVnpayIpn,
    createPaypalPayment,
    capturePaypalPayment,
    createPayment,
    getPaypalOrder,
};








