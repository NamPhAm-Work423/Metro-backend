const paymentService = require('../services/payment.service');
const SepayService = require('../services/sepay.service');
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

// Initiate a Sepay QR payment (POST /v1/payment/sepay/qr)
async function initiateSepayPayment(req, res) {
    try {
        const { ticketId, passengerId, amount, orderDescription } = req.body;

        // Validate required fields
        if (!ticketId || !passengerId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: ticketId, passengerId, amount'
            });
        }

        // Generate unique payment ID
        const paymentId = `sepay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create Sepay QR payment
        const result = await SepayService.createQr({
            paymentId,
            ticketId,
            passengerId,
            amountVnd: amount,
            orderDescription: orderDescription || `Payment for ticket ${ticketId}`
        });

        // Publish event to Kafka
        await publish('payment.initiated', paymentId, {
            paymentId,
            ticketId,
            passengerId,
            amount,
            orderDescription: orderDescription || `Payment for ticket ${ticketId}`,
            paymentMethod: 'SEPAY',
            status: 'PENDING',
            createdAt: new Date()
        });

        res.status(201).json({
            success: true,
            data: result
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

// Handle Sepay webhook (POST /v1/payment/sepay/webhook)
async function handleSepayWebhook(req, res) {
    try {
        const payload = req.body;
        
        // Process webhook
        const result = await SepayService.handleWebhook(payload);

        if (result.ok) {
            // Publish event to Kafka if payment was completed
            if (payload.status === 'completed' && payload.description) {
                await publish('payment.completed', payload.description, {
                    paymentId: payload.description,
                    status: 'COMPLETED',
                    message: 'Payment completed via Sepay',
                    gatewayResponse: payload
                });
            }

            res.status(200).json({ success: true, message: 'Webhook processed successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Webhook processing failed' });
        }

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    initiateVnpayPayment,
    handleVnpayReturn,
    handleVnpayIpn,
    initiateSepayPayment,
    handleSepayWebhook
};
