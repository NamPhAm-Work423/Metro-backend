const { Kafka } = require('kafkajs');
const { logger } = require('../config/logger');
const { Payment, Transaction, PaymentLog } = require('../models/index.model');
const { createPaypalPayment, createPayment } = require('../services/payment.service');
const {
    publishTicketPaymentReady,
    publishTicketPaymentReadyFallback,
    publishPaymentCompleted,
    publishTicketPaymentReadyNonPaypal,
    publishPaymentFailed,
    publishPaymentCompletedForActivation,
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

const exchangeVNDtoUSD = (amount) => {
    return amount / 26000;
}
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
    const currency = event.currency || 'VND';

    try {
        if (!ticketId || !paymentId || !passengerId || !amount || !ticketType || !status) {
            throw new Error('Missing required fields in ticket.created event');
        }

        // Process payment based on payment method
        const paymentMethod = ticketData.paymentMethod || 'paypal';
        
        if (paymentMethod.toLowerCase() === 'paypal') {
            try {
                const orderInfo = `Ticket payment for ${ticketType} - Ticket ID: ${ticketId}`;
                
                
                // PayPal doesn't support VND currency, so we always convert to USD
                let processedAmount = exchangeVNDtoUSD(amount);
                // PayPal only supports 2 decimal places for USD
                processedAmount = Math.round(processedAmount * 100) / 100;
                let paypalCurrency = 'USD'; // Always use USD for PayPal
                
                // Log the currency conversion for debugging
                logger.info('Currency conversion for PayPal', {
                    originalAmount: amount,
                    originalCurrency: currency,
                    convertedAmount: processedAmount,
                    paypalCurrency: paypalCurrency,
                    ticketId: ticketId
                });

                // Start timing for performance monitoring
                const totalStartTime = Date.now();
                
                // Create PayPal payment and database operations in parallel
                const startTime = Date.now();
                const { paypalOrder, payment: paypalPayment } = await createPaypalPayment({
                    paymentId: paymentId,
                    ticketId: ticketId,
                    passengerId: passengerId,
                    amount: processedAmount,
                    orderInfo: orderInfo,
                    currency: paypalCurrency,
                    returnUrl: ticketData.paymentSuccessUrl,
                    cancelUrl: ticketData.paymentCancelUrl || ticketData.paymentFailUrl
                });
                
                const paymentDuration = Date.now() - startTime;
                const totalDuration = Date.now() - totalStartTime;
                logger.info('PayPal payment creation completed', { 
                    paymentDuration: paymentDuration,
                    totalDuration: totalDuration,
                    ticketId: ticketId 
                });

                // Debug: Log PayPal order details
                logger.info('PayPal order created', {
                    orderId: paypalOrder.id,
                    status: paypalOrder.status,
                    links: paypalOrder.links?.map(link => ({
                        rel: link.rel,
                        href: link.href,
                        method: link.method
                    })) || [],
                    returnUrl: ticketData.paymentSuccessUrl,
                    cancelUrl: ticketData.paymentCancelUrl || ticketData.paymentFailUrl,
                    hasReturnUrl: !!ticketData.paymentSuccessUrl,
                    hasCancelUrl: !!(ticketData.paymentCancelUrl || ticketData.paymentFailUrl)
                });

                // Publish events in parallel
                const publishPromises = [];
                
                if (ticketId && paymentId) {
                    // Extract PayPal approval link from order
                    let approvalLink = paypalOrder.links?.find(link => link.rel === 'approve')?.href;
                    
                    // If no approval link found, create a fallback URL
                    if (!approvalLink) {
                        // Always use sandbox URLs for academic project
                        const baseUrl = 'https://www.sandbox.paypal.com/checkoutnow';
                        
                        // Create approval URL with order ID
                        approvalLink = `${baseUrl}?token=${paypalOrder.id}`;
                        
                        // Alternative fallback URL format
                        if (!approvalLink || approvalLink.includes('undefined')) {
                            const altBaseUrl = 'https://www.sandbox.paypal.com/webapps/checkout';
                            approvalLink = `${altBaseUrl}?token=${paypalOrder.id}`;
                        }
                    }

                    // Log the approval link for debugging
                    logger.info('PayPal approval link generated', {
                        ticketId,
                        paymentId,
                        approvalLink,
                        paypalOrderId: paypalOrder.id,
                        hasLinks: !!paypalOrder.links,
                        linksCount: paypalOrder.links?.length || 0
                    });
                    
                    publishPromises.push(
                        publishTicketPaymentReady(ticketId, paymentId, passengerId, exchangeVNDtoUSD(amount), paypalOrder, approvalLink)
                    );
                }

                // Wait for all publish operations to complete
                await Promise.all(publishPromises);



            } catch (paypalError) {
                logger.error('Failed to create PayPal payment', {
                    error: paypalError.message,
                    ticketId,
                    paymentId
                });
                
                // Check if it's a timeout or network error and provide fallback
                if (paypalError.message && (
                    paypalError.message.includes('timeout') || 
                    paypalError.message.includes('network') ||
                    paypalError.message.includes('Client Authentication failed')
                )) {
                    logger.warn('PayPal request failed, falling back to test mode', {
                        ticketId,
                        paymentId,
                        error: paypalError.message
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

                            
                        } else {
                            await createPayment({
                                paymentId: paymentId,
                                ticketId: ticketId,
                                passengerId: passengerId,
                                amount: exchangeVNDtoUSD(amount),
                                paymentMethod: 'paypal',
                                paymentStatus: 'PENDING',
                                paymentGatewayResponse: {
                                    error: 'PayPal authentication failed',
                                    fallbackMode: true,
                                    originalError: paypalError.message
                                }
                            });
                        }




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
                        await publishTicketPaymentReadyFallback(ticketId, paymentId, passengerId, amount, approvalLink);
                    }


                    
                    return; 
                }
                
                throw paypalError;
            }
        } else {
            // Default to other payment methods (not PayPal)
            try {
                // Create payment record
                const payment = await createPayment({
                    paymentId: paymentId,
                    ticketId: ticketId,
                    passengerId: passengerId,
                    amount: amount,
                    paymentMethod: paymentMethod,
                    paymentStatus: 'COMPLETED',
                    paymentGatewayResponse: {
                        ticketData: ticketData,
                        ticketType: ticketType,
                        originalEvent: event,
                        testMode: true,
                        message: 'Payment completed in test mode'
                    }
                });

                // Publish events in parallel
                const parallelOperations = [];

                // Add publish operations
                if (paymentId && ticketId) {
                    parallelOperations.push(
                        publishPaymentCompleted(paymentId, ticketId, passengerId, exchangeVNDtoUSD(amount), paymentMethod)
                    );
                }

                if (ticketId && paymentId) {
                    parallelOperations.push(
                        publishTicketPaymentReadyNonPaypal(ticketId, paymentId, paymentMethod)
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

        await publishPaymentCompletedForActivation(paymentId, ticketId, passengerId, paymentData);



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
            topic: 'ticket.activated', 
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

