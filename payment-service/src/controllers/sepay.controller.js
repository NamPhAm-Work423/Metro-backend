const SepayService = require('../services/sepay.service');
const { Payment, Transaction, PaymentLog } = require('../models/index.model');
const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

/**
 * Create a Sepay order
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function createSepayOrder(req, res) {
    try {
        const { ticketId, passengerId, amount, orderDescription } = req.body;

        // Validate required fields
        if (!ticketId || !passengerId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: ticketId, passengerId, amount'
            });
        }

        // Validate amount
        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
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

        logger.info(`Sepay order created: ${paymentId} for ticket: ${ticketId}`);

        res.status(201).json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Error creating Sepay order:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Internal server error' 
        });
    }
}

/**
 * Get Sepay order details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSepayOrder(req, res) {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        const payment = await Payment.findByPk(orderId);
        
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Get transaction details if exists
        const transaction = await Transaction.findOne({
            where: { paymentId: orderId }
        });

        const orderDetails = {
            paymentId: payment.paymentId,
            ticketId: payment.ticketId,
            passengerId: payment.passengerId,
            amount: payment.paymentAmount,
            currency: payment.currency,
            status: payment.paymentStatus,
            paymentMethod: payment.paymentMethod,
            createdAt: payment.createdAt,
            paymentDate: payment.paymentDate,
            description: payment.description,
            transaction: transaction ? {
                transactionAmount: transaction.transactionAmount,
                transactionStatus: transaction.transactionStatus,
                createdAt: transaction.createdAt
            } : null
        };

        res.status(200).json({
            success: true,
            data: orderDetails
        });

    } catch (error) {
        logger.error('Error getting Sepay order:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Internal server error' 
        });
    }
}

/**
 * Check if Sepay order is ready for capture
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function checkSepayOrderStatus(req, res) {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        const payment = await Payment.findByPk(orderId);
        
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const isReadyForCapture = payment.paymentStatus === 'PENDING';
        const canCapture = isReadyForCapture && !payment.paymentDate;

        res.status(200).json({
            success: true,
            data: {
                orderId: payment.paymentId,
                status: payment.paymentStatus,
                isReadyForCapture: canCapture,
                canCapture,
                paymentDate: payment.paymentDate
            }
        });

    } catch (error) {
        logger.error('Error checking Sepay order status:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Internal server error' 
        });
    }
}

/**
 * Capture a Sepay payment (manual capture for pending orders)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function captureSepayPayment(req, res) {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        const payment = await Payment.findByPk(orderId);
        
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (payment.paymentStatus !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: `Cannot capture payment with status: ${payment.paymentStatus}`
            });
        }

        // For Sepay, we typically don't have manual capture
        // This endpoint might be used for verification or status update
        // In a real implementation, you might call Sepay API to verify payment
        
        res.status(200).json({
            success: true,
            message: 'Payment capture request processed',
            data: {
                orderId: payment.paymentId,
                status: payment.paymentStatus,
                message: 'Sepay payments are automatically captured via webhook'
            }
        });

    } catch (error) {
        logger.error('Error capturing Sepay payment:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Internal server error' 
        });
    }
}

/**
 * Handle Sepay webhook events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleSepayWebhook(req, res) {
    try {
        const payload = req.body;
        
        logger.info('Received Sepay webhook:', payload);
        
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
                
                logger.info(`Payment completed via Sepay webhook: ${payload.description}`);
            }

            res.status(200).json({ 
                success: true, 
                message: 'Webhook processed successfully' 
            });
        } else {
            logger.warn('Sepay webhook processing failed:', payload);
            res.status(400).json({ 
                success: false, 
                message: 'Webhook processing failed' 
            });
        }

    } catch (error) {
        logger.error('Error handling Sepay webhook:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Internal server error' 
        });
    }
}

module.exports = {
    createSepayOrder,
    getSepayOrder,
    checkSepayOrderStatus,
    captureSepayPayment,
    handleSepayWebhook
};
