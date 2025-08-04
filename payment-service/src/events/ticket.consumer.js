const { Kafka } = require('kafkajs');
const { logger } = require('../config/logger');
const { Payment, Transaction, PaymentLog } = require('../models/index.model');
const { createPaypalPayment } = require('../services/payment.service');
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
    // Extract variables at the beginning to ensure they're available in error handling
    const ticketId = event.ticketId;
    const paymentId = event.paymentId;
    const passengerId = event.passengerId;
    const amount = event.amount;
    const ticketType = event.ticketType;
    const ticketData = event.ticketData || {};
    const status = event.status;

    try {
        if (!ticketId || !paymentId || !passengerId || !amount || !ticketType || !status) {
            throw new Error('Missing required fields in ticket.created event');
        }

        // Process payment based on payment method
        const paymentMethod = ticketData.paymentMethod || 'paypal';
        
        if (paymentMethod.toLowerCase() === 'paypal') {
            try {
                const orderInfo = `Ticket payment for ${ticketType} - Ticket ID: ${ticketId}`;
                const currency = ticketData.currency || 'USD';
                
                // Create PayPal payment (includes database operations)
                const { paypalOrder, payment: paypalPayment } = await createPaypalPayment({
                    paymentId: paymentId,
                    ticketId: ticketId,
                    passengerId: passengerId,
                    amount: amount,
                    orderInfo: orderInfo,
                    currency: currency
                });

                // Publish events in parallel
                const publishPromises = [];
                
                if (ticketId && paymentId) {
                    // Extract PayPal approval link from order
                    let approvalLink = paypalOrder.links?.find(link => link.rel === 'approve')?.href;
                    
                    // If no approval link found, create a fallback URL
                    if (!approvalLink) {
                        const isProduction = process.env.NODE_ENV === 'production';
                        const baseUrl = isProduction 
                            ? 'https://www.paypal.com/cgi-bin/webscr'
                            : 'https://www.sandbox.paypal.com/cgi-bin/webscr';
                        
                        // Create approval URL with order ID
                        approvalLink = `${baseUrl}?cmd=_express-checkout&token=${paypalOrder.id}`;
                        
                        logger.info('Created fallback PayPal approval URL', {
                            isProduction,
                            baseUrl,
                            paypalOrderId: paypalOrder.id,
                            approvalLink
                        });
                    }
                    
                    logger.info('PayPal order links analysis', {
                        ticketId,
                        paymentId,
                        paypalOrderId: paypalOrder.id,
                        hasLinks: !!paypalOrder.links,
                        linksCount: paypalOrder.links?.length || 0,
                        allLinks: paypalOrder.links?.map(link => ({
                            rel: link.rel,
                            href: link.href,
                            method: link.method
                        })) || [],
                        originalApprovalLink: paypalOrder.links?.find(link => link.rel === 'approve')?.href,
                        finalApprovalLink: approvalLink,
                        isProduction: process.env.NODE_ENV === 'production',
                        nodeEnv: process.env.NODE_ENV
                    });
                    
                    publishPromises.push(
                        publish('ticket.payment_ready', ticketId, {
                            ticketId: ticketId,
                            paymentId: paymentId,
                            passengerId: passengerId,
                            amount: amount,
                            paymentMethod: 'paypal',
                            paypalOrderId: paypalOrder.id,
                            paypalOrder: paypalOrder,
                            paymentUrl: approvalLink || null,
                            status: 'PAYMENT_READY',
                            createdAt: new Date().toISOString()
                        }).catch(publishError => {
                            logger.error('Failed to publish ticket.payment_ready event for PayPal', {
                                error: publishError.message,
                                paymentId,
                                ticketId
                            });
                        })
                    );
                }

                // Wait for all publish operations to complete
                await Promise.all(publishPromises);

                logger.info('PayPal payment processed successfully', {
                    paymentId: paymentId,
                    ticketId: ticketId,
                    paypalOrderId: paypalOrder.id
                });

            } catch (paypalError) {
                logger.error('Failed to create PayPal payment', {
                    error: paypalError.message,
                    ticketId,
                    paymentId
                });
                
                // Check if it's an authentication error and provide fallback
                if (paypalError.message && paypalError.message.includes('Client Authentication failed')) {
                    logger.warn('PayPal authentication failed, falling back to test mode', {
                        ticketId,
                        paymentId
                    });
                    
                    // Check if payment already exists and update it instead of creating new
                    try {
                        let existingPayment = await Payment.findOne({
                            where: { paymentId: paymentId }
                        });

                        if (existingPayment) {
                            // Update existing payment with fallback information
                            existingPayment.paymentGatewayResponse = {
                                ...existingPayment.paymentGatewayResponse,
                                error: 'PayPal authentication failed',
                                fallbackMode: true,
                                originalError: paypalError.message
                            };
                            await existingPayment.save();

                            logger.info('Updated existing payment with fallback information', {
                                paymentId: paymentId,
                                ticketId: ticketId
                            });
                        } else {
                            // Create new payment record if it doesn't exist
                            const testPayment = await Payment.create({
                                paymentId: paymentId,
                                ticketId: ticketId,
                                passengerId: passengerId,
                                paymentAmount: amount,
                                paymentMethod: 'paypal',
                                paymentStatus: 'PENDING',
                                paymentDate: new Date(),
                                paymentGatewayResponse: {
                                    error: 'PayPal authentication failed',
                                    fallbackMode: true,
                                    originalError: paypalError.message
                                }
                            });

                            logger.info('Created new fallback payment record', {
                                paymentId: paymentId,
                                ticketId: ticketId
                            });
                        }

                        // Create payment log for the fallback payment
                        await PaymentLog.create({
                            paymentId: paymentId,
                            paymentLogType: 'PAYMENT',
                            paymentLogDate: new Date(),
                            paymentLogStatus: 'PENDING',
                        });

                        logger.info('Fallback payment log created successfully', {
                            paymentId: paymentId,
                            ticketId: ticketId
                        });
                    } catch (dbError) {
                        logger.error('Failed to create/update fallback payment record', {
                            error: dbError.message,
                            details: dbError.errors || dbError,
                            ticketId,
                            paymentId
                        });
                        throw dbError;
                    }

                    // Publish fallback event
                    if (ticketId && paymentId) {
                        await publish('ticket.payment_ready', ticketId, {
                            ticketId: ticketId,
                            paymentId: paymentId,
                            passengerId: passengerId,
                            amount: amount,
                            paymentMethod: 'paypal',
                            paypalOrderId: null,
                            paymentUrl: approvalLink,
                            status: 'PAYMENT_READY',
                            fallbackMode: true,
                            error: 'PayPal authentication failed',
                            createdAt: new Date().toISOString()
                        }).catch(publishError => {
                            logger.error('Failed to publish fallback payment event', {
                                error: publishError.message,
                                paymentId,
                                ticketId
                            });
                        });
                    }

                    logger.info('Fallback payment created due to PayPal authentication failure', {
                        paymentId: paymentId,
                        ticketId: ticketId
                    });
                    
                    return; 
                }
                
                throw paypalError;
            }
        } else {
            // Default to other payment methods (not PayPal)
            try {
                // Create payment record
                const payment = await Payment.create({
                    paymentId: paymentId,
                    ticketId: ticketId,
                    passengerId: passengerId,
                    paymentAmount: amount,
                    paymentMethod: paymentMethod,
                    paymentStatus: 'COMPLETED',
                    paymentDate: new Date(),
                    paymentGatewayResponse: {
                        ticketData: ticketData,
                        ticketType: ticketType,
                        originalEvent: event,
                        testMode: true,
                        message: 'Payment completed in test mode'
                    }
                });

                // Create payment log and publish events in parallel
                const parallelOperations = [
                    PaymentLog.create({
                        paymentId: payment.paymentId,
                        paymentLogType: 'PAYMENT',
                        paymentLogDate: new Date(),
                        paymentLogStatus: 'COMPLETED',
                    })
                ];

                // Add publish operations
                if (paymentId && ticketId) {
                    parallelOperations.push(
                        publish('payment.completed', paymentId, {
                            paymentId: paymentId,
                            ticketId: ticketId,
                            passengerId: passengerId,
                            amount: amount,
                            paymentMethod: paymentMethod,
                            status: 'COMPLETED',
                            testMode: true
                        }).catch(publishError => {
                            logger.error('Failed to publish payment.completed event', {
                                error: publishError.message,
                                paymentId,
                                ticketId
                            });
                        })
                    );
                }

                if (ticketId && paymentId) {
                    parallelOperations.push(
                        publish('ticket.payment_ready', ticketId, {
                            ticketId: ticketId,
                            paymentId: paymentId,
                            paymentUrl: null, // No payment URL for non-PayPal methods
                            paymentMethod: paymentMethod,
                            paypalOrderId: null,
                            status: 'PAYMENT_READY',
                            testMode: true,
                            createdAt: new Date().toISOString()
                        }).catch(publishError => {
                            logger.error('Failed to publish ticket.payment_ready event', {
                                error: publishError.message,
                                paymentId,
                                ticketId
                            });
                        })
                    );
                }

                // Execute all operations in parallel
                await Promise.all(parallelOperations);

                logger.info('Payment processed successfully', {
                    paymentId: paymentId,
                    ticketId: ticketId,
                    paymentMethod: paymentMethod
                });

            } catch (dbError) {
                logger.error('Database error processing payment', {
                    error: dbError.message,
                    ticketId,
                    paymentId
                });
                throw dbError;
            }
        }

    } catch (error) {
        logger.error('Error processing ticket.created event', {
            error: error.message,
            ticketId: ticketId || 'unknown',
            paymentId: paymentId || 'unknown'
        });

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

        const payment = await Payment.findOne({
            where: { paymentId: paymentId }
        });

        if (!payment) {
            logger.warn('Payment not found for ticket.activated event', { paymentId });
            return;
        }

        payment.paymentStatus = 'COMPLETED';
        payment.paymentGatewayResponse = {
            ...payment.paymentGatewayResponse,
            activationEvent: event,
            paymentData: paymentData
        };
        await payment.save();

        await Transaction.create({
            paymentId: payment.paymentId,
            transactionAmount: payment.paymentAmount,
            transactionStatus: 'COMPLETED',
        });

        await PaymentLog.create({
            paymentId: payment.paymentId,
            paymentLogType: 'PAYMENT',
            paymentLogDate: new Date(),
            paymentLogStatus: 'COMPLETED',
        });

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
                let event;
                try {
                    event = JSON.parse(message.value.toString());
                    
                    // Minimal logging for performance
                    logger.debug('Processing ticket event', {
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
    handleTicketActivated,
    handleTicketCancelled
};

