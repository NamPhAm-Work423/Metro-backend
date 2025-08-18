const paypalService = require('../services/paypal.service');
const { Payment, Transaction, PaymentLog } = require('../models/index.model');
const { publish } = require('../kafka/kafkaProducer');
const logger = require('../config/logger');

/**
 * Create a PayPal order
 * @route POST /v1/payment/paypal/create-order
 */
async function createPaypalOrder(req, res) {
    try {
        const { ticketId, passengerId, amount, currency = 'USD', orderInfo } = req.body;
        
        if (!ticketId || !passengerId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'ticketId, passengerId, and amount are required'
            });
        }

        // Create payment record (PENDING)
        const payment = await Payment.create({
            ticketId,
            passengerId,
            paymentAmount: amount,
            paymentMethod: 'paypal',
            paymentStatus: 'PENDING',
            paymentDate: new Date(),
            paymentGatewayResponse: null
        });

        // Prepare PayPal order data
        const paypalOrderData = {
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: currency,
                    value: amount.toString()
                },
                description: orderInfo || `Ticket payment for ticket ${ticketId}`,
                custom_id: payment.paymentId.toString()
            }]
        };

        // Create PayPal order
        const paypalOrder = await paypalService.createOrder(paypalOrderData);

        // Update payment with PayPal order ID
        payment.paymentGatewayResponse = {
            paypalOrderId: paypalOrder.id,
            paypalOrderData: paypalOrder
        };
        await payment.save();

        // Log payment initiation
        await PaymentLog.create({
            paymentId: payment.paymentId,
            paymentLogType: 'PAYMENT',
            paymentLogDate: new Date(),
            paymentLogStatus: 'PENDING',
        });

        // Publish event to Kafka
        await publish('payment.initiated', payment.paymentId, {
            paymentId: payment.paymentId,
            ticketId,
            passengerId,
            amount,
            orderInfo,
            paymentMethod: 'paypal',
            status: 'PENDING',
            paypalOrderId: paypalOrder.id,
            createdAt: payment.paymentDate
        });

        res.status(201).json({
            success: true,
            paymentId: payment.paymentId,
            paypalOrderId: paypalOrder.id,
            approvalUrl: paypalOrder.links.find(link => link.rel === 'approve')?.href,
            captureUrl: paypalOrder.links.find(link => link.rel === 'capture')?.href
        });

    } catch (error) {
        logger.error('PayPal create order error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Capture a PayPal payment
 * @route POST /v1/payment/paypal/capture/:orderId
 */
async function capturePaypalPayment(req, res) {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'PayPal order ID is required'
            });
        }

        // Capture the payment
        const captureResult = await paypalService.captureOrder(orderId);

        // Find the payment record
        const payment = await Payment.findOne({
            where: {
                paymentMethod: 'paypal',
                paymentStatus: 'PENDING'
            },
            order: [['paymentDate', 'DESC']]
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
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

        // Publish event to Kafka
        await publish(
            payment.paymentStatus === 'COMPLETED' ? 'payment.completed' : 'payment.failed',
            payment.paymentId,
            {
                paymentId: payment.paymentId,
                status: payment.paymentStatus,
                paypalOrderId: orderId,
                captureResult
            }
        );

        res.status(200).json({
            success: true,
            paymentId: payment.paymentId,
            status: payment.paymentStatus,
            captureResult
        });

    } catch (error) {
        logger.error('PayPal capture payment error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Get PayPal order details
 * @route GET /v1/payment/paypal/order/:orderId
 */
async function getPaypalOrder(req, res) {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'PayPal order ID is required'
            });
        }

        const orderDetails = await paypalService.getOrder(orderId);

        res.status(200).json({
            success: true,
            orderDetails
        });

    } catch (error) {
        logger.error('PayPal get order error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Handle PayPal webhook
 * @route POST /v1/payment/paypal/webhook
 */
async function handlePaypalWebhook(req, res) {
    try {
        const event = req.body;
        logger.info('PayPal webhook received:', { eventType: event.event_type });

        // Handle different webhook events
        switch (event.event_type) {
            case 'PAYMENT.CAPTURE.COMPLETED':
                await handlePaymentCaptureCompleted(event);
                break;
            case 'PAYMENT.CAPTURE.DENIED':
                await handlePaymentCaptureDenied(event);
                break;
            case 'PAYMENT.CAPTURE.PENDING':
                await handlePaymentCapturePending(event);
                break;
            default:
                logger.info('Unhandled PayPal webhook event:', { eventType: event.event_type });
        }

        res.status(200).json({ success: true });

    } catch (error) {
        logger.error('PayPal webhook error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Handle PAYMENT.CAPTURE.COMPLETED webhook
 */
async function handlePaymentCaptureCompleted(event) {
    try {
        const capture = event.resource;
        const orderId = capture.supplementary_data?.related_ids?.order_id;

        // Find payment by PayPal order ID
        const payment = await Payment.findOne({
            where: {
                paymentMethod: 'paypal',
                paymentStatus: 'PENDING'
            },
            order: [['paymentDate', 'DESC']]
        });

        if (!payment) {
            logger.warn('Payment not found for PayPal order:', { orderId });
            return;
        }

        // Update payment status
        payment.paymentStatus = 'COMPLETED';
        payment.paymentGatewayResponse = {
            ...payment.paymentGatewayResponse,
            webhookEvent: event,
            capture
        };
        await payment.save();

        // Log payment result
        await PaymentLog.create({
            paymentId: payment.paymentId,
            paymentLogType: 'PAYMENT',
            paymentLogDate: new Date(),
            paymentLogStatus: 'COMPLETED',
        });

        // Create transaction
        await Transaction.create({
            paymentId: payment.paymentId,
            transactionAmount: payment.paymentAmount,
            transactionStatus: 'COMPLETED',
        });

        // Publish event to Kafka
        await publish('payment.completed', payment.paymentId, {
            paymentId: payment.paymentId,
            status: 'COMPLETED',
            paypalOrderId: orderId,
            capture
        });

        logger.info('Payment completed via PayPal webhook:', { paymentId: payment.paymentId });

    } catch (error) {
        logger.error('Error handling PAYMENT.CAPTURE.COMPLETED:', error);
        throw error;
    }
}

/**
 * Handle PAYMENT.CAPTURE.DENIED webhook
 */
async function handlePaymentCaptureDenied(event) {
    try {
        const capture = event.resource;
        const orderId = capture.supplementary_data?.related_ids?.order_id;

        // Find payment by PayPal order ID
        const payment = await Payment.findOne({
            where: {
                paymentMethod: 'paypal',
                paymentStatus: 'PENDING'
            },
            order: [['paymentDate', 'DESC']]
        });

        if (!payment) {
            logger.warn('Payment not found for PayPal order:', { orderId });
            return;
        }

        // Update payment status
        payment.paymentStatus = 'FAILED';
        payment.paymentGatewayResponse = {
            ...payment.paymentGatewayResponse,
            webhookEvent: event,
            capture
        };
        await payment.save();

        // Log payment result
        await PaymentLog.create({
            paymentId: payment.paymentId,
            paymentLogType: 'PAYMENT',
            paymentLogDate: new Date(),
            paymentLogStatus: 'FAILED',
        });

        // Publish event to Kafka
        await publish('payment.failed', payment.paymentId, {
            paymentId: payment.paymentId,
            status: 'FAILED',
            paypalOrderId: orderId,
            capture
        });

        logger.info('Payment failed via PayPal webhook:', { paymentId: payment.paymentId });

    } catch (error) {
        logger.error('Error handling PAYMENT.CAPTURE.DENIED:', error);
        throw error;
    }
}

/**
 * Handle PAYMENT.CAPTURE.PENDING webhook
 */
async function handlePaymentCapturePending(event) {
    try {
        const capture = event.resource;
        const orderId = capture.supplementary_data?.related_ids?.order_id;

        logger.info('PayPal payment capture pending:', { orderId });

        // Payment remains in PENDING status
        // No action needed as payment is still being processed

    } catch (error) {
        logger.error('Error handling PAYMENT.CAPTURE.PENDING:', error);
        throw error;
    }
}

module.exports = {
    createPaypalOrder,
    capturePaypalPayment,
    getPaypalOrder,
    handlePaypalWebhook
};
