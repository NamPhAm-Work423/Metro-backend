const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');
const { Payment } = require('../models/index.model');
const { 
    publishPaymentCompletedForActivation,
    publishPaymentFailed,
    publishPaymentCancelled
} = require('./payment.producer');

/**
 * PayPal Hook Consumer for processing PayPal webhook events
 * This consumer handles webhook events from PayPal and maps them to payment records
 * using paypalOrderId to find the corresponding payment and ticket information
 */
class PayPalHookConsumer {
    constructor() {
        this.eventConsumer = null;
    }

    /**
     * Handle PayPal checkout order completed event
     * @param {Object} webhookData - PayPal webhook data
     */
    async handleCheckoutOrderCompleted(webhookData) {
        try {
            const { resource } = webhookData;
            const paypalOrderId = resource.id;
            const orderStatus = resource.status;

            logger.info('Processing PayPal order completed webhook', {
                paypalOrderId,
                orderStatus,
                eventType: webhookData.event_type
            });

            if (orderStatus !== 'COMPLETED') {
                logger.warn('PayPal order is not completed', {
                    paypalOrderId,
                    orderStatus
                });
                return;
            }

            // Find payment record using paypalOrderId
            const payment = await this.findPaymentByPayPalOrderId(paypalOrderId);
            if (!payment) {
                logger.error('Payment not found for PayPal order', {
                    paypalOrderId
                });
                return;
            }

            // Extract capture information
            const captures = resource.purchase_units?.[0]?.payments?.captures || [];
            if (captures.length === 0) {
                logger.error('No captures found in PayPal webhook', {
                    paypalOrderId,
                    paymentId: payment.paymentId
                });
                return;
            }

            const capture = captures[0];
            const captureId = capture.id;
            const captureStatus = capture.status;
            const captureAmount = parseFloat(capture.amount.value);

            logger.info('PayPal capture details', {
                paypalOrderId,
                captureId,
                captureStatus,
                captureAmount,
                paymentId: payment.paymentId
            });

            if (captureStatus !== 'COMPLETED') {
                logger.warn('PayPal capture not completed', {
                    paypalOrderId,
                    captureId,
                    captureStatus
                });
                return;
            }

            // Update payment record
            const updatedPaymentData = {
                ...payment.paymentGatewayResponse,
                webhook: webhookData,
                captureId: captureId,
                completedAt: new Date().toISOString()
            };

            await payment.update({
                paymentStatus: 'COMPLETED',
                paymentGatewayResponse: updatedPaymentData
            });

            logger.info('Payment updated successfully from PayPal webhook', {
                paymentId: payment.paymentId,
                ticketId: payment.ticketId,
                captureId
            });

            // Publish payment completed event for ticket activation
            await publishPaymentCompletedForActivation(
                payment.paymentId,
                payment.ticketId,
                payment.passengerId,
                {
                    paypalOrderId: paypalOrderId,
                    captureId: captureId,
                    amount: captureAmount,
                    currency: capture.amount.currency_code,
                    paymentMethod: 'paypal',
                    webhookProcessed: true,
                    payer: resource.payer
                }
            );

            logger.info('PayPal webhook processed successfully', {
                paypalOrderId,
                paymentId: payment.paymentId,
                ticketId: payment.ticketId
            });

        } catch (error) {
            logger.error('Error processing PayPal order completed webhook', {
                error: error.message,
                stack: error.stack,
                webhookData
            });
            throw error;
        }
    }

    /**
     * Handle PayPal order cancelled/failed events
     * @param {Object} webhookData - PayPal webhook data
     */
    async handleOrderCancelledOrFailed(webhookData) {
        try {
            const { resource } = webhookData;
            const paypalOrderId = resource.id;
            const orderStatus = resource.status;

            logger.info('Processing PayPal order cancelled/failed webhook', {
                paypalOrderId,
                orderStatus,
                eventType: webhookData.event_type
            });

            // Find payment record
            const payment = await this.findPaymentByPayPalOrderId(paypalOrderId);
            if (!payment) {
                logger.error('Payment not found for cancelled PayPal order', {
                    paypalOrderId
                });
                return;
            }

            // Update payment status
            const failureReason = webhookData.event_type === 'CHECKOUT.ORDER.CANCELLED' 
                ? 'Order cancelled by user' 
                : 'Order failed';

            await payment.update({
                paymentStatus: 'FAILED',
                paymentGatewayResponse: {
                    ...payment.paymentGatewayResponse,
                    webhook: webhookData,
                    failureReason: failureReason
                }
            });

            // Publish payment cancelled/failed event
            if (webhookData.event_type === 'CHECKOUT.ORDER.CANCELLED') {
                await publishPaymentCancelled(
                    payment.paymentId,
                    payment.ticketId,
                    payment.passengerId,
                    'CANCELLED',
                    failureReason
                );
            } else {
                await publishPaymentFailed(
                    payment.paymentId,
                    payment.ticketId,
                    failureReason
                );
            }

            logger.info('PayPal cancellation/failure webhook processed', {
                paypalOrderId,
                paymentId: payment.paymentId,
                status: orderStatus
            });

        } catch (error) {
            logger.error('Error processing PayPal cancellation/failure webhook', {
                error: error.message,
                webhookData
            });
            throw error;
        }
    }

    /**
     * Find payment record by PayPal Order ID
     * @param {string} paypalOrderId - PayPal order ID
     * @returns {Object|null} Payment record or null if not found
     */
    async findPaymentByPayPalOrderId(paypalOrderId) {
        try {
            // Search in paymentGatewayResponse JSON field for paypalOrderId
            const payment = await Payment.findOne({
                where: {
                    paymentMethod: 'paypal',
                    paymentGatewayResponse: {
                        paypalOrderId: paypalOrderId
                    }
                }
            });

            return payment;
        } catch (error) {
            logger.error('Error finding payment by PayPal order ID', {
                error: error.message,
                paypalOrderId
            });
            return null;
        }
    }

    /**
     * Process incoming Kafka messages from webhook service
     * @param {Object} messageData - Raw message data from Kafka
     */
    async processMessage(messageData) {
        const { topic, partition, message } = messageData;
        
        if (!message.value) {
            logger.warn('Received empty webhook message', { topic, partition });
            return;
        }
        
        let webhookData;
        try {
            webhookData = JSON.parse(message.value.toString());
            logger.info(`Received PayPal webhook event: ${topic}`, {
                topic,
                partition,
                offset: message.offset,
                key: message.key?.toString(),
                eventType: webhookData.event_type,
                paypalOrderId: webhookData.resource?.id
            });
        } catch (e) {
            logger.error('JSON parse error for webhook message', { 
                error: e.message,
                messageValue: message.value.toString()
            });
            return;
        }
        
        const payload = webhookData.payload || webhookData;
        
        // Route to appropriate handler based on PayPal event type
        switch (payload.event_type) {
            case 'PAYMENT.CAPTURE.COMPLETED':
                await this.handleCheckoutOrderCompleted(payload);
                break;
            case 'PAYMENT.CAPTURE.DENIED':
                await this.handleOrderCancelledOrFailed(payload);
                break;
                            
            default:
                logger.info(`Unhandled PayPal webhook event type: ${payload.event_type}`, {
                    eventType: payload.event_type,
                    paypalOrderId: payload.resource?.id
                });
        }
    }

    /**
     * Start consuming PayPal webhook events
     */
    async start() {
        try {
            const topics = ['paypal.webhook.event'];

            this.eventConsumer = new KafkaEventConsumer({
                clientId: process.env.KAFKA_CLIENT_ID || 'payment-service',
                brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
                groupId: 'payment-service-paypal-webhook',
                topics,
                eachMessage: this.processMessage.bind(this)
            });

            await this.eventConsumer.start();
            logger.info('PayPal hook consumer started successfully');
        } catch (error) {
            logger.error('Failed to start PayPal hook consumer:', error);
            throw error;
        }
    }

    /**
     * Stop consuming events
     */
    async stop() {
        if (this.eventConsumer) {
            await this.eventConsumer.stop();
            logger.info('PayPal hook consumer stopped');
        }
    }

    /**
     * Check if consumer is healthy
     */
    async isHealthy() {
        return this.eventConsumer ? this.eventConsumer.isHealthy() : false;
    }

    /**
     * Get consumer statistics
     */
    async getStats() {
        return this.eventConsumer ? this.eventConsumer.getStats() : {};
    }
}

module.exports = PayPalHookConsumer;
