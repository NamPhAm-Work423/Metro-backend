const { Kafka } = require('kafkajs');
const { logger } = require('../config/logger');
const { Payment, Transaction, PaymentLog } = require('../models/index.model');
const { createVnpayPayment, createPaypalPayment } = require('../services/payment.service');
const { publish } = require('../kafka/kafkaProducer');

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'payment-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

const consumer = kafka.consumer({ groupId: 'payment-service-ticket-group' });

/**
 * Handle ticket.created event
 * Creates payment record and initiates payment process
 */
async function handleTicketCreated(event) {
    try {
        const { 
            ticketId, 
            paymentId, 
            passengerId, 
            amount, 
            ticketType, 
            ticketData,
            status 
        } = event;

        logger.info('Processing ticket.created event', {
            ticketId,
            paymentId,
            passengerId,
            amount,
            ticketType
        });

        // Create payment record
        const payment = await Payment.create({
            paymentId: paymentId, // Use paymentId from ticket service
            ticketId: ticketId,
            passengerId: passengerId,
            paymentAmount: amount,
            paymentMethod: ticketData.paymentMethod || 'vnpay',
            paymentStatus: 'PENDING',
            paymentDate: new Date(),
            paymentGatewayResponse: {
                ticketData: ticketData,
                ticketType: ticketType,
                originalEvent: event
            }
        });

        // Log payment creation
        await PaymentLog.create({
            paymentId: payment.paymentId,
            paymentLogType: 'PAYMENT',
            paymentLogDate: new Date(),
            paymentLogStatus: 'PENDING',
        });

        // Determine payment method and create payment URL
        let paymentResult;
        const paymentMethod = ticketData.paymentMethod || 'vnpay';

        if (paymentMethod === 'vnpay') {
            paymentResult = await createVnpayPayment({
                ticketId: ticketId,
                passengerId: passengerId,
                amount: amount,
                orderInfo: `Metro ticket ${ticketType} - ${ticketId}`,
                returnUrl: `${process.env.API_GATEWAY_URL}/v1/payment/vnpay/return`,
                clientIp: '127.0.0.1' // Will be updated with actual client IP
            });
        } else if (paymentMethod === 'paypal') {
            paymentResult = await createPaypalPayment({
                ticketId: ticketId,
                passengerId: passengerId,
                amount: amount,
                orderInfo: `Metro ticket ${ticketType} - ${ticketId}`,
                currency: 'USD'
            });
        } else {
            throw new Error(`Unsupported payment method: ${paymentMethod}`);
        }

        // Update payment with gateway response
        payment.paymentGatewayResponse = {
            ...payment.paymentGatewayResponse,
            paymentUrl: paymentResult.paymentUrl || paymentResult.paypalOrder?.links,
            gatewayOrderId: paymentResult.paypalOrder?.id
        };
        await payment.save();

        // Publish payment initiated event
        await publish('payment.initiated', paymentId, {
            paymentId: paymentId,
            ticketId: ticketId,
            passengerId: passengerId,
            amount: amount,
            paymentMethod: paymentMethod,
            paymentUrl: paymentResult.paymentUrl || paymentResult.paypalOrder?.links,
            status: 'PENDING',
            ticketType: ticketType,
            createdAt: new Date().toISOString()
        });

        logger.info('Payment initiated successfully', {
            paymentId: paymentId,
            ticketId: ticketId,
            paymentMethod: paymentMethod,
            paymentUrl: paymentResult.paymentUrl ? 'VNPay URL generated' : 'PayPal order created'
        });

    } catch (error) {
        logger.error('Failed to handle ticket.created event', {
            ticketId: event.ticketId,
            paymentId: event.paymentId,
            error: error.message,
            stack: error.stack
        });

        // Publish payment failed event
        await publish('payment.failed', event.paymentId, {
            paymentId: event.paymentId,
            ticketId: event.ticketId,
            passengerId: event.passengerId,
            error: error.message,
            status: 'FAILED',
            failedAt: new Date().toISOString()
        });

        throw error;
    }
}

/**
 * Handle ticket.activated event (when payment is completed)
 * Updates payment status and creates transaction
 */
async function handleTicketActivated(event) {
    try {
        const { 
            ticketId, 
            paymentId, 
            passengerId, 
            status,
            paymentData 
        } = event;

        logger.info('Processing ticket.activated event', {
            ticketId,
            paymentId,
            status
        });

        // Find and update payment
        const payment = await Payment.findOne({
            where: { paymentId: paymentId }
        });

        if (!payment) {
            logger.warn('Payment not found for ticket.activated event', { paymentId });
            return;
        }

        // Update payment status
        payment.paymentStatus = 'COMPLETED';
        payment.paymentGatewayResponse = {
            ...payment.paymentGatewayResponse,
            activationEvent: event,
            paymentData: paymentData
        };
        await payment.save();

        // Create transaction record
        await Transaction.create({
            paymentId: payment.paymentId,
            transactionAmount: payment.paymentAmount,
            transactionStatus: 'COMPLETED',
        });

        // Log payment completion
        await PaymentLog.create({
            paymentId: payment.paymentId,
            paymentLogType: 'PAYMENT',
            paymentLogDate: new Date(),
            paymentLogStatus: 'COMPLETED',
        });

        // Publish payment completed event
        await publish('payment.completed', paymentId, {
            paymentId: paymentId,
            ticketId: ticketId,
            passengerId: passengerId,
            status: 'COMPLETED',
            paymentData: paymentData,
            completedAt: new Date().toISOString()
        });

        logger.info('Payment completed successfully', {
            paymentId: paymentId,
            ticketId: ticketId
        });

    } catch (error) {
        logger.error('Failed to handle ticket.activated event', {
            ticketId: event.ticketId,
            paymentId: event.paymentId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Handle ticket.cancelled event
 * Updates payment status and handles refund if needed
 */
async function handleTicketCancelled(event) {
    try {
        const { 
            ticketId, 
            paymentId, 
            passengerId, 
            status,
            reason 
        } = event;

        logger.info('Processing ticket.cancelled event', {
            ticketId,
            paymentId,
            reason
        });

        // Find payment
        const payment = await Payment.findOne({
            where: { paymentId: paymentId }
        });

        if (!payment) {
            logger.warn('Payment not found for ticket.cancelled event', { paymentId });
            return;
        }

        // Update payment status based on current status
        if (payment.paymentStatus === 'COMPLETED') {
            // Payment was completed, mark for refund
            payment.paymentStatus = 'REFUND_PENDING';
        } else if (payment.paymentStatus === 'PENDING') {
            // Payment was pending, mark as cancelled
            payment.paymentStatus = 'CANCELLED';
        }

        payment.paymentGatewayResponse = {
            ...payment.paymentGatewayResponse,
            cancellationEvent: event,
            cancellationReason: reason
        };
        await payment.save();

        // Log cancellation
        await PaymentLog.create({
            paymentId: payment.paymentId,
            paymentLogType: 'CANCELLATION',
            paymentLogDate: new Date(),
            paymentLogStatus: payment.paymentStatus,
        });

        // Publish payment cancelled event
        await publish('payment.cancelled', paymentId, {
            paymentId: paymentId,
            ticketId: ticketId,
            passengerId: passengerId,
            status: payment.paymentStatus,
            reason: reason,
            cancelledAt: new Date().toISOString()
        });

        logger.info('Payment cancelled successfully', {
            paymentId: paymentId,
            ticketId: ticketId,
            reason: reason
        });

    } catch (error) {
        logger.error('Failed to handle ticket.cancelled event', {
            ticketId: event.ticketId,
            paymentId: event.paymentId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Start consuming ticket events
 */
async function startTicketConsumer() {
    try {
        await consumer.connect();
        await consumer.subscribe({ 
            topic: 'ticket.created', 
            fromBeginning: false 
        });
        await consumer.subscribe({ 
            topic: 'ticket.activated', 
            fromBeginning: false 
        });
        await consumer.subscribe({ 
            topic: 'ticket.cancelled', 
            fromBeginning: false 
        });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const event = JSON.parse(message.value.toString());
                    
                    logger.info('Received ticket event', {
                        topic,
                        ticketId: event.ticketId,
                        paymentId: event.paymentId
                    });

                    switch (topic) {
                        case 'ticket.created':
                            await handleTicketCreated(event);
                            break;
                        case 'ticket.activated':
                            await handleTicketActivated(event);
                            break;
                        case 'ticket.cancelled':
                            await handleTicketCancelled(event);
                            break;
                        default:
                            logger.warn('Unknown ticket event topic', { topic });
                    }
                } catch (error) {
                    logger.error('Error processing ticket event', {
                        topic,
                        error: error.message,
                        message: message.value.toString()
                    });
                }
            }
        });

        logger.info('Ticket consumer started successfully');

    } catch (error) {
        logger.error('Failed to start ticket consumer', { error: error.message });
        throw error;
    }
}

/**
 * Stop consuming ticket events
 */
async function stopTicketConsumer() {
    try {
        await consumer.disconnect();
        logger.info('Ticket consumer stopped successfully');
    } catch (error) {
        logger.error('Failed to stop ticket consumer', { error: error.message });
        throw error;
    }
}

module.exports = {
    startTicketConsumer,
    stopTicketConsumer,
    handleTicketCreated,
    handleTicketActivated,
    handleTicketCancelled
};

