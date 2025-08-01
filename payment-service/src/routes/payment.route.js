const express = require('express');
const { Payment } = require('../models/index.model');
const { logger } = require('../config/logger');

const router = express.Router();

/**
 * Get payment URL for a ticket
 * @route GET /v1/payment/ticket/:ticketId
 */
router.get('/ticket/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;

        // Find payment by ticket ID
        const payment = await Payment.findOne({
            where: { ticketId: ticketId }
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found for this ticket'
            });
        }

        // Extract payment URL from gateway response
        const paymentUrl = payment.paymentGatewayResponse?.paymentUrl;
        const gatewayOrderId = payment.paymentGatewayResponse?.gatewayOrderId;

        if (!paymentUrl && !gatewayOrderId) {
            return res.status(404).json({
                success: false,
                message: 'Payment URL not available'
            });
        }

        res.json({
            success: true,
            data: {
                paymentId: payment.paymentId,
                ticketId: payment.ticketId,
                amount: payment.paymentAmount,
                paymentMethod: payment.paymentMethod,
                paymentStatus: payment.paymentStatus,
                paymentUrl: paymentUrl,
                gatewayOrderId: gatewayOrderId,
                createdAt: payment.paymentDate
            }
        });

    } catch (error) {
        logger.error('Error getting payment URL', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * Get payment status for a ticket
 * @route GET /v1/payment/status/:ticketId
 */
router.get('/status/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;

        // Find payment by ticket ID
        const payment = await Payment.findOne({
            where: { ticketId: ticketId }
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found for this ticket'
            });
        }

        res.json({
            success: true,
            data: {
                paymentId: payment.paymentId,
                ticketId: payment.ticketId,
                amount: payment.paymentAmount,
                paymentMethod: payment.paymentMethod,
                paymentStatus: payment.paymentStatus,
                createdAt: payment.paymentDate,
                updatedAt: payment.updatedAt
            }
        });

    } catch (error) {
        logger.error('Error getting payment status', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router; 