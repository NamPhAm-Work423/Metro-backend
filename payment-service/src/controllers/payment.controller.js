const paymentService = require('../services/payment.service');
const { publish } = require('../kafka/kafkaProducer');

// Initiate a VNPay payment (POST /v1/payment/vnpay)
async function initiateVnpayPayment(req, res) {
    try {
        const { ticketId, passengerId, amount, orderInfo, returnUrl } = req.body;
        const clientIp = req.ip || req.connection.remoteAddress;
        const { paymentUrl, payment } = await paymentService.createVnpayPayment({
            ticketId,
            passengerId,
            amount,
            orderInfo,
            returnUrl,
            clientIp
        });
        // Publish event to Kafka
        await publish('payment.initiated', payment.paymentId, {
            paymentId: payment.paymentId,
            ticketId,
            passengerId,
            amount,
            orderInfo,
            paymentMethod: 'VNPAY',
            status: 'PENDING',
            createdAt: payment.paymentDate
        });
        res.status(201).json({ success: true, paymentUrl, paymentId: payment.paymentId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Handle VNPay return URL (GET /v1/payment/vnpay/return)
async function handleVnpayReturn(req, res) {
    try {
        const result = await paymentService.handleVnpayReturn(req.query);
        // Publish event to Kafka
        await publish(
            result.isSuccess ? 'payment.completed' : 'payment.failed',
            result.payment?.paymentId || null,
            {
                paymentId: result.payment?.paymentId,
                status: result.isSuccess ? 'COMPLETED' : 'FAILED',
                message: result.message,
                gatewayResponse: req.query
            }
        );
        res.status(200).json({ success: result.isSuccess, message: result.message });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Handle VNPay IPN (POST /v1/payment/vnpay/ipn)
async function handleVnpayIpn(req, res) {
    try {
        const result = await paymentService.handleVnpayIpn(req.body);
        // Publish event to Kafka
        await publish(
            result.isSuccess ? 'payment.completed' : 'payment.failed',
            result.payment?.paymentId || null,
            {
                paymentId: result.payment?.paymentId,
                status: result.isSuccess ? 'COMPLETED' : 'FAILED',
                message: result.message,
                gatewayResponse: req.body
            }
        );
        res.status(200).json({ success: result.isSuccess, message: result.message });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    initiateVnpayPayment,
    handleVnpayReturn,
    handleVnpayIpn
};
