const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');
const { Payment } = require('../models/index.model');
const { 
    publishPaymentCompleted,
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
            const captureId = resource.id;
            const captureStatus = resource.status;
            const customId = resource.custom_id; // This is our payment ID
            
            logger.info('Processing PayPal capture completed webhook', {
                captureId,
                captureStatus,
                customId,
                eventType: webhookData.event_type
            });

            if (captureStatus !== 'COMPLETED') {
                logger.warn('PayPal capture is not completed', {
                    captureId,
                    captureStatus
                });
                return;
            }

            // Find payment record using custom_id (payment ID) as primary method
            let payment = null;
            
            // Method 1: Find by payment ID (custom_id from capture)
            if (customId) {
                payment = await Payment.findOne({
                    where: {
                        paymentId: customId,
                        paymentMethod: 'paypal'
                    }
                });
                
                if (payment) {
                    logger.info('Payment found by custom_id (payment ID)', {
                        paymentId: customId,
                        captureId
                    });
                }
            }
            
            // Method 2: Fallback to find by capture ID in gateway response
            if (!payment) {
                payment = await this.findPaymentByCaptureId(captureId);
                if (payment) {
                    logger.info('Payment found by capture ID fallback', {
                        paymentId: payment.paymentId,
                        captureId
                    });
                }
            }
            
            if (!payment) {
                logger.error('Payment not found for PayPal capture', {
                    captureId,
                    customId,
                    eventType: webhookData.event_type
                });
                return;
            }

            // For PAYMENT.CAPTURE.COMPLETED, resource is the capture itself
            const captureAmount = parseFloat(resource.amount.value);
            const currency = resource.amount.currency_code;

            logger.info('PayPal capture details', {
                captureId,
                captureAmount,
                currency,
                paymentId: payment.paymentId
            });

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

            // Publish payment completed event with webhook confirmation
            await publishPaymentCompleted(
                payment.paymentId,
                payment.ticketId,
                payment.passengerId,
                captureAmount,
                'paypal',
                {
                    captureId: captureId,
                    currency: currency,
                    webhookProcessed: true,
                    payer: resource.payer
                }
            );

            logger.info('PayPal webhook processed successfully', {
                captureId,
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
            const captureId = resource.id;
            const captureStatus = resource.status;
            const customId = resource.custom_id;

            logger.info('Processing PayPal capture denied/failed webhook', {
                captureId,
                captureStatus,
                customId,
                eventType: webhookData.event_type
            });

            // Find payment record using custom_id (payment ID) as primary method
            let payment = null;
            
            // Method 1: Find by payment ID (custom_id from capture)
            if (customId) {
                payment = await Payment.findOne({
                    where: {
                        paymentId: customId,
                        paymentMethod: 'paypal'
                    }
                });
            }
            
            // Method 2: Fallback to find by capture ID in gateway response
            if (!payment) {
                payment = await this.findPaymentByCaptureId(captureId);
            }
            
            if (!payment) {
                logger.error('Payment not found for denied PayPal capture', {
                    captureId,
                    customId
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
                captureId,
                paymentId: payment.paymentId,
                status: captureStatus
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
     * Find payment record by PayPal Capture ID
     * @param {string} captureId - PayPal capture ID
     * @returns {Object|null} Payment record or null if not found
     */
    async findPaymentByCaptureId(captureId) {
        try {
            // Search in paymentGatewayResponse JSON field for captureId
            const payment = await Payment.findOne({
                where: {
                    paymentMethod: 'paypal',
                    paymentGatewayResponse: {
                        captureId: captureId
                    }
                }
            });

            if (payment) {
                return payment;
            }

            // Fallback: search in nested captureResult
            const allPayments = await Payment.findAll({
                where: {
                    paymentMethod: 'paypal'
                }
            });
            
            const payment2 = allPayments.find(p => 
                p.paymentGatewayResponse?.captureResult?.id === captureId ||
                p.paymentGatewayResponse?.captureResult?.purchase_units?.[0]?.payments?.captures?.some(c => c.id === captureId)
            );

            return payment2 || null;
        } catch (error) {
            logger.error('Error finding payment by PayPal capture ID', {
                error: error.message,
                captureId
            });
            return null;
        }
    }

    /**
     * Find payment record by PayPal Order ID (legacy method, kept for compatibility)
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
                resourceId: webhookData.resource?.id,
                customId: webhookData.resource?.custom_id
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
                    resourceId: payload.resource?.id,
                    customId: payload.resource?.custom_id
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
