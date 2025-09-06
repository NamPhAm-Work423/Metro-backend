const { Kafka } = require('kafkajs');
const { logger } = require('../config/logger');
const { Payment, Transaction, PaymentLog } = require('../models/index.model');
const { PaymentStrategyFactory } = require('../strategies/payment');
const {
    publishPaymentFailed,
    publishPaymentCancelled
} = require('./payment.producer');

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'payment-service',
    brokers: (process.env.KAFKA_BROKERS).split(','),
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

const consumer = kafka.consumer({ 
    groupId: 'payment-service-ticket-group',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxWaitTimeInMs: 1000
});

/**
 * Payment Processing Service
 * Handles payment processing using strategy pattern
 */
class PaymentProcessingService {
    constructor() {
        this.strategyFactory = PaymentStrategyFactory;
    }

    /**
     * Process payment for a ticket using appropriate strategy
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>} Payment result
     */
    async processPayment(paymentData) {
        const { ticketData = {} } = paymentData;
        const paymentMethod = ticketData.paymentMethod || 'paypal';
        
        logger.info('Processing payment', {
            paymentId: paymentData.paymentId,
            ticketId: paymentData.ticketId,
            paymentMethod
        });

        const strategy = this.strategyFactory.getStrategy(paymentMethod);
        return await strategy.processPayment(paymentData);
    }
}
// Initialize payment processing service
const paymentService = new PaymentProcessingService();

/**
 * Handle ticket.created event
 * Creates payment record and initiates payment process using strategy pattern
 */
async function handleTicketCreated(event) {
    // Extract variables at the beginning to ensure they're available in error handling
    const ticketId = event.ticketId;
    const paymentId = event.paymentId;
    const passengerId = event.passengerId;
    const amount = event.amount;
    const ticketType = event.ticketType;
    const ticketData = event.ticketData || {};
    const status = event.status;
    const currency = event.currency || 'VND';

    try {
        // Validate required fields
        if (!ticketId || !paymentId || !passengerId || !amount || !ticketType || !status) {
            throw new Error('Missing required fields in ticket.created event');
        }

        // Prepare payment data
        const paymentData = {
            paymentId,
            ticketId,
            passengerId,
            amount,
            currency,
            ticketType,
            ticketData,
            status
        };

        // Process payment using strategy pattern
        const result = await paymentService.processPayment(paymentData);

        logger.info('Payment processed successfully', {
            paymentId,
            ticketId,
            paymentMethod: ticketData.paymentMethod || 'paypal',
            success: result.success,
            fallbackMode: result.fallbackMode || false,
            testMode: result.testMode || false
        });

    } catch (error) {
        logger.error('Error processing ticket.created event', {
            error: error.message,
            ticketId: ticketId || 'unknown',
            paymentId: paymentId || 'unknown'
        });

        // Publish payment failed event
        if (paymentId && ticketId) {
            try {
                await publishPaymentFailed(paymentId, ticketId, error.message);
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



        const payment = await Payment.findOne({
            where: { paymentId: paymentId }
        });

        if (!payment) {
            logger.warn('Payment not found for ticket.cancelled event', { paymentId });
            return;
        }

        if (payment.paymentStatus === 'COMPLETED') {
            payment.paymentStatus = 'REFUND_PENDING';
        } else if (payment.paymentStatus === 'PENDING') {
            payment.paymentStatus = 'CANCELLED';
        }

        payment.paymentGatewayResponse = {
            ...payment.paymentGatewayResponse,
            cancellationEvent: event,
            cancellationReason: reason
        };
        await payment.save();

        await PaymentLog.create({
            paymentId: payment.paymentId,
            paymentLogType: 'CANCELLATION',
            paymentLogDate: new Date(),
            paymentLogStatus: payment.paymentStatus,
        });

        await publishPaymentCancelled(paymentId, ticketId, passengerId, payment.paymentStatus, reason);



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
            topic: 'ticket.cancelled', 
            fromBeginning: false 
        });

        await consumer.run({
            autoCommit: true,
            autoCommitInterval: 5000,
            autoCommitThreshold: 100,
            eachMessage: async ({ topic, partition, message }) => {
                let event;
                try {
                    event = JSON.parse(message.value.toString());
                    


                    switch (topic) {
                        case 'ticket.created':
                            await handleTicketCreated(event);
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
                        ticketId: event?.ticketId,
                        paymentId: event?.paymentId
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
    handleTicketCancelled
};

