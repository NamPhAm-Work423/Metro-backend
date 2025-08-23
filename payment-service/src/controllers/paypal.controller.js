const paypalService = require('../services/paypal.service');
const { logger } = require('../config/logger');

/**
 * Create a PayPal order
 * @route POST /v1/payment/paypal/create-order
 */
async function createPaypalOrder(req, res) {
    try {
        const { ticketId, passengerId, amount, currency, orderInfo } = req.body;
        
        // Validate input
        if (!ticketId || !passengerId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'ticketId, passengerId, and amount are required'
            });
        }

        // Call service to create payment order
        const result = await paypalService.createPaymentOrder({
            ticketId,
            passengerId,
            amount,
            currency,
            orderInfo
        });

        // Return success response
        res.status(201).json({
            success: true,
            paymentId: result.payment.paymentId,
            paypalOrderId: result.paypalOrder.id,
            approvalUrl: result.approvalUrl,
            captureUrl: result.captureUrl
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

        // Validate input
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'PayPal order ID is required'
            });
        }

        // Call service to capture payment
        const result = await paypalService.capturePayment(orderId);

        // Return success response
        res.status(200).json({
            success: true,
            paymentId: result.payment.paymentId,
            status: result.payment.paymentStatus,
            captureResult: result.captureResult
        });

    } catch (error) {
        logger.error('PayPal capture payment error:', error);
        
        // Handle specific service errors
        if (error.message.startsWith('ORDER_NOT_APPROVED:')) {
            const currentStatus = error.message.split(':')[1];
            return res.status(400).json({
                success: false,
                message: `Order cannot be captured. Current status: ${currentStatus}. Please ensure the order is approved by the payer.`,
                orderStatus: currentStatus,
                requiresAction: currentStatus === 'CREATED' ? 'USER_APPROVAL_REQUIRED' : 'ORDER_NOT_CAPTURABLE'
            });
        }

        if (error.message.startsWith('PAYMENT_NOT_FOUND:')) {
            const orderId = error.message.split(':')[1];
            return res.status(404).json({
                success: false,
                message: `Payment not found for PayPal order: ${orderId}`,
                orderId
            });
        }
        
        // Handle PayPal API errors
        if (error.name === 'UNPROCESSABLE_ENTITY') {
            const orderNotApproved = error.details?.find(detail => detail.issue === 'ORDER_NOT_APPROVED');
            
            if (orderNotApproved) {
                return res.status(400).json({
                    success: false,
                    message: 'Order has not been approved by the payer. Please redirect the user to the approval URL.',
                    errorCode: 'ORDER_NOT_APPROVED',
                    paypalError: {
                        name: error.name,
                        details: error.details,
                        debugId: error.debug_id
                    }
                });
            }
        }
        
        // Handle other PayPal errors
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message || 'PayPal API error',
                paypalError: {
                    name: error.name,
                    details: error.details,
                    debugId: error.debug_id
                }
            });
        }
        
        // Generic server error
        res.status(500).json({
            success: false,
            message: 'Internal server error while processing payment capture',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

        // Add helpful status information
        const statusInfo = {
            canCapture: orderDetails.status === 'APPROVED',
            needsApproval: orderDetails.status === 'CREATED',
            approvalUrl: orderDetails.links?.find(link => link.rel === 'approve')?.href
        };

        res.status(200).json({
            success: true,
            orderDetails,
            statusInfo
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
 * Check if PayPal order is ready for capture
 * @route GET /v1/payment/paypal/check-status/:orderId
 */
async function checkPaypalOrderStatus(req, res) {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'PayPal order ID is required'
            });
        }

        const orderDetails = await paypalService.getOrder(orderId);

        const response = {
            success: true,
            orderId,
            status: orderDetails.status,
            canCapture: orderDetails.status === 'APPROVED',
            needsApproval: orderDetails.status === 'CREATED',
            readyForWebhook: false
        };

        // Add appropriate actions based on status
        switch (orderDetails.status) {
            case 'CREATED':
                response.action = 'REDIRECT_TO_APPROVAL';
                response.approvalUrl = orderDetails.links?.find(link => link.rel === 'approve')?.href;
                response.message = 'Order created but not approved. Redirect user to approval URL.';
                break;
            case 'APPROVED':
                response.action = 'READY_TO_CAPTURE';
                response.message = 'Order approved and ready for capture.';
                break;
            case 'COMPLETED':
                response.action = 'ALREADY_CAPTURED';
                response.readyForWebhook = true;
                response.message = 'Order already captured. Waiting for webhook confirmation.';
                break;
            default:
                response.action = 'UNKNOWN_STATUS';
                response.message = `Unknown order status: ${orderDetails.status}`;
        }

        res.status(200).json(response);

    } catch (error) {
        logger.error('PayPal check order status error:', error);
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

        // Call service to handle webhook event
        await paypalService.handleWebhookEvent(event);

        // Return success response
        res.status(200).json({ success: true });

    } catch (error) {
        logger.error('PayPal webhook error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}



module.exports = {
    createPaypalOrder,
    capturePaypalPayment,
    getPaypalOrder,
    checkPaypalOrderStatus,
    handlePaypalWebhook
};
