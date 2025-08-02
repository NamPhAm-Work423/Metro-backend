const { Kafka } = require('kafkajs');
const { logger } = require('../config/logger');
const { Payment, Transaction, PaymentLog } = require('../models/index.model');
const { createVnpayPayment, createPaypalPayment } = require('../services/payment.service');
const { publish } = require('../kafka/kafkaProducer');

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'payment-service',
    brokers: (process.env.KAFKA_BROKERS).split(','),
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
        // Extract data from event with proper validation
        const ticketId = event.ticketId;
        const paymentId = event.paymentId;
        const passengerId = event.passengerId;
        const amount = event.amount;
        const ticketType = event.ticketType;
        const ticketData = event.ticketData || {};
        const status = event.status;

        // Validate required fields
        if (!ticketId) {
            throw new Error('ticketId is required in ticket.created event');
        }
        if (!paymentId) {
            throw new Error('paymentId is required in ticket.created event');
        }
        if (!passengerId) {
            throw new Error('passengerId is required in ticket.created event');
        }
        if (!amount) {
            throw new Error('amount is required in ticket.created event');
        }

        logger.info('Processing ticket.created event', {
            ticketId,
            paymentId,
            passengerId,
            amount,
            ticketType
        });



        let payment;
        try {
            // Create payment record
            payment = await Payment.create({
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

            logger.info('Payment record created successfully', {
                paymentId: payment.paymentId
            });
        } catch (dbError) {
            logger.error('Database error creating payment record', {
                error: dbError.message,
                ticketId,
                paymentId
            });
            throw dbError;
        }

        // Log payment creation
        if (payment) {
            await PaymentLog.create({
                paymentId: payment.paymentId,
                paymentLogType: 'PAYMENT',
                paymentLogDate: new Date(),
                paymentLogStatus: 'PENDING',
            });
        }

        // TEMPORARY: Skip payment gateway processing for testing
        logger.info('Temporarily skipping payment gateway processing for testing');
        
        // Update payment status to COMPLETED for testing
        payment.paymentStatus = 'COMPLETED';
        payment.paymentGatewayResponse = {
            ...payment.paymentGatewayResponse,
            testMode: true,
            message: 'Payment completed in test mode'
        };
        await payment.save();

        // Publish payment completed event for testing
        if (paymentId && ticketId) {
            try {
                await publish('payment.completed', paymentId, {
                    paymentId: paymentId,
                    ticketId: ticketId,
                    passengerId: passengerId,
                    amount: amount,
                    paymentMethod: ticketData.paymentMethod || 'card',
                    status: 'COMPLETED',
                    testMode: true
                });
            } catch (publishError) {
                logger.error('Failed to publish payment.completed event', {
                    error: publishError.message,
                    paymentId,
                    ticketId
                });
            }
        }

        // Publish ticket payment ready event to update ticket service
        if (ticketId && paymentId) {
            try {
                await publish('ticket.payment_ready', ticketId, {
                    ticketId: ticketId,
                    paymentId: paymentId,
                    paymentUrl: 'test_mode_payment_url',
                    paymentMethod: ticketData.paymentMethod || 'card',
                    paypalOrderId: null, // Add this field for consistency
                    status: 'PAYMENT_READY',
                    testMode: true,
                    createdAt: new Date().toISOString()
                });
            } catch (publishError) {
                logger.error('Failed to publish ticket.payment_ready event', {
                    error: publishError.message,
                    paymentId,
                    ticketId
                });
            }
        }

        logger.info('Payment completed successfully in test mode', {
            paymentId: paymentId,
            ticketId: ticketId,
            paymentMethod: ticketData.paymentMethod || 'card',
            testMode: true
        });

    } catch (error) {
        logger.error('Error processing ticket.created event', {
            error: error.message,
            ticketId: ticketId || 'unknown',
            paymentId: paymentId || 'unknown'
        });

        // Publish payment failed event only if we have the required data
        if (paymentId && ticketId) {
            try {
                await publish('payment.failed', paymentId, {
                    paymentId: paymentId,
                    ticketId: ticketId,
                    error: error.message,
                    status: 'FAILED',
                    createdAt: new Date().toISOString()
                });
            } catch (publishError) {
                logger.error('Failed to publish payment.failed event', {
                    error: publishError.message,
                    paymentId,
                    ticketId
                });
            }
        }

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
                        paymentId: event.paymentId,
                        eventData: event // Log full event data for debugging
                    });

                    logger.info('Event data validation', {
                        hasTicketId: !!event.ticketId,
                        hasPaymentId: !!event.paymentId,
                        hasPassengerId: !!event.passengerId,
                        hasAmount: !!event.amount,
                        eventKeys: Object.keys(event)
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

