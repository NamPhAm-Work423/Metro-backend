const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');
const { Ticket } = require('../models/index.model');
const { paymentCache } = require('../cache/paymentCache');
const PaymentCompletionHandler = require('../services/ticket/handlers/PaymentCompletionHandler');

/**
 * Payment consumer event for ticket service
 * This class is used to consume payment events from Kafka
 * and update ticket with payment information including payment URL
 */
class PaymentConsumer {
    constructor() {
        this.eventConsumer = null;
        // Use shared payment cache instead of separate instance
        this.paymentCache = paymentCache;
    }

    /**
     * Handle payment completed event from payment service
     * @param {Object} eventData - The payment completed event data
     */
    async handlePaymentCompleted(eventData) {
        try {
            const { 
                paymentId, 
                ticketId, 
                passengerId,
                status,
                paymentData = {}
            } = eventData;

            logger.info('Processing payment completed event', {
                ticketId,
                paymentId,
                passengerId,
                status,
                paymentMethod: paymentData.paymentMethod
            });

            // Find ticket
            const ticket = await Ticket.findByPk(ticketId);
            if (!ticket) {
                logger.error('Ticket not found for payment completed event', { ticketId });
                return;
            }

            // Process payment completion using dedicated handler
            const result = await PaymentCompletionHandler.processPaymentCompletion(
                ticket, 
                paymentId, 
                paymentData
            );

            if (!result.success) {
                logger.warn('Payment completion processing failed', {
                    ticketId,
                    paymentId,
                    reason: result.reason
                });
                return;
            }

            // Store payment completion data in cache for reference
            this.paymentCache.set(`completed_${paymentId}`, {
                ticketId,
                paymentId,
                status: 'COMPLETED',
                ticketType: result.ticketType,
                activatedAt: result.updateData.activatedAt,
                paymentData
            });

            // Ensure purchaseDate is recorded on successful payment
            try {
                const purchaseDate = new Date();
                await ticket.update({ purchaseDate, updatedAt: purchaseDate });
                logger.info('Ticket purchaseDate set after payment completion', {
                    ticketId,
                    paymentId,
                    purchaseDate
                });
            } catch (pdError) {
                logger.error('Failed to set purchaseDate after payment completion', {
                    ticketId,
                    paymentId,
                    error: pdError.message
                });
            }

        } catch (error) {
            logger.error('Error processing payment completed event', {
                error: error.message,
                eventData
            });
            throw error;
        }
    }

    /**
     * Handle payment failed event from payment service
     * @param {Object} eventData - The payment failed event data
     */
    async handlePaymentFailed(eventData) {
        try {
            const { paymentId, ticketId, error: failureReason } = eventData;

            logger.info('Processing payment failed event', {
                ticketId,
                paymentId,
                failureReason
            });

            // Find and update ticket
            const ticket = await Ticket.findByPk(ticketId);
            if (!ticket) {
                logger.error('Ticket not found for payment failed event', { ticketId });
                return;
            }

            // Update ticket to a valid status; keep as pending to allow retry
            await ticket.update({
                status: 'pending_payment',
                updatedAt: new Date()
            });

            logger.info('Ticket marked as payment failed', {
                ticketId,
                paymentId,
                failureReason
            });

        } catch (error) {
            logger.error('Error processing payment failed event', {
                error: error.message,
                eventData
            });
        }
    }

    /**
     * Handle payment cancelled event from payment service
     * @param {Object} eventData - The payment cancelled event data
     */
    async handlePaymentCancelled(eventData) {
        try {
            const { paymentId, ticketId, reason } = eventData;

            logger.info('Processing payment cancelled event', {
                ticketId,
                paymentId,
                reason
            });

            // Find and update ticket
            const ticket = await Ticket.findByPk(ticketId);
            if (!ticket) {
                logger.error('Ticket not found for payment cancelled event', { ticketId });
                return;
            }

            // Update ticket to cancelled status
            await ticket.update({
                status: 'cancelled',
                updatedAt: new Date()
            });

            logger.info('Ticket marked as cancelled', {
                ticketId,
                paymentId,
                reason
            });

        } catch (error) {
            logger.error('Error processing payment cancelled event', {
                error: error.message,
                eventData
            });
        }
    }

    /**
     * Handle payment ready event from payment service
     * @param {Object} eventData - The payment ready event data
     */
    async handlePaymentReady(eventData) {
        try {
            const { 
                ticketId, 
                paymentId, 
                paymentUrl, 
                paymentMethod, 
                paypalOrderId = null,
                status,
                redirectUrls = {}
            } = eventData;

            logger.info('Processing payment ready event', {
                ticketId,
                paymentId,
                paymentMethod,
                hasPaymentUrl: !!paymentUrl,
                paymentUrl: paymentUrl
            });

            // Store payment data in cache for immediate access
            this.paymentCache.set(paymentId, {
                ticketId,
                paymentId,
                paymentUrl,
                paymentMethod,
                paypalOrderId,
                status,
                redirectUrls
            });

            // Also store by ticket ID for fallback
            this.paymentCache.set(ticketId, {
                ticketId,
                paymentId,
                paymentUrl,
                paymentMethod,
                paypalOrderId,
                status,
                redirectUrls
            });

            // Update ticket with payment information
            const ticket = await Ticket.findByPk(ticketId);
            if (!ticket) {
                logger.error('Ticket not found for payment ready event', { ticketId });
                return;
            }

            // Update ticket status to indicate payment is ready
            const updateData = {
                status: 'pending_payment',
                updatedAt: new Date()
            };

            logger.info('Updating ticket with payment ready status', {
                ticketId,
                paymentId,
                paymentMethod,
                updateData,
                originalStatus: ticket.status,
                paymentUrl: paymentUrl,
                paypalOrderId: paypalOrderId
            });

            try {
                await ticket.update(updateData);
                logger.info('Ticket update completed successfully', { 
                    ticketId, 
                    paymentId,
                    paymentUrl: paymentUrl,
                    paypalOrderId: paypalOrderId
                });
            } catch (updateError) {
                logger.error('Failed to update ticket with payment information', {
                    ticketId,
                    paymentId,
                    error: updateError.message,
                    updateData
                });
                throw updateError;
            }

            logger.info('Payment ready event processed successfully', {
                ticketId,
                paymentId,
                paymentUrl: paymentUrl,
                paypalOrderId: paypalOrderId
            });

        } catch (error) {
            logger.error('Error processing payment ready event', {
                error: error.message,
                eventData
            });
        }
    }

    /**
     * Get payment data from cache
     * @param {string} key - Payment ID or ticket ID
     * @returns {Object|null} Payment data or null if not found
     */
    getPaymentData(key) {
        // Use shared cache's get method which handles expiry automatically
        return this.paymentCache.get(key);
    }

    /**
     * Process incoming Kafka messages
     * @param {Object} messageData - Raw message data from Kafka
     */
    async processMessage(messageData) {
        const { topic, partition, message } = messageData;
        
        if (!message.value) {
            logger.warn('Received empty message', { topic, partition });
            return;
        }
        
        let data;
        try {
            data = JSON.parse(message.value.toString());
            logger.info(`Received payment event: ${topic}`, {
                topic,
                partition,
                offset: message.offset,
                key: message.key?.toString(),
                eventData: data
            });
        } catch (e) {
            logger.error('JSON parse error for Kafka message', { 
                error: e.message,
                messageValue: message.value.toString()
            });
            return;
        }
        
        const payload = data.payload || data;
        
        // Route to appropriate handler based on topic
        switch (topic) {
            case 'ticket.payment_ready':
                await this.handlePaymentReady(payload);
                break;
                
            case 'payment.completed':
                await this.handlePaymentCompleted(payload);
                break;
                
            case 'payment.failed':
                await this.handlePaymentFailed(payload);
                break;
                
            case 'payment.cancelled':
                await this.handlePaymentCancelled(payload);
                break;
                
            default:
                logger.warn(`Unknown payment event topic: ${topic}`);
        }
    }

    /**
     * Start consuming payment events
     */
    async start() {
        try {
            const topics = [
                'ticket.payment_ready',
                'payment.completed',
                'payment.failed',
                'payment.cancelled'
            ];

            this.eventConsumer = new KafkaEventConsumer({
                clientId: process.env.KAFKA_CLIENT_ID || 'ticket-service',
                brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
                groupId: 'ticket-service-payment',
                topics,
                eachMessage: this.processMessage.bind(this)
            });

            await this.eventConsumer.start();
            logger.info('Payment consumer started successfully');
        } catch (error) {
            logger.error('Failed to start payment consumer:', error);
            throw error;
        }
    }

    /**
     * Stop consuming events
     */
    async stop() {
        if (this.eventConsumer) {
            await this.eventConsumer.stop();
            logger.info('Payment consumer stopped');
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

module.exports = PaymentConsumer; 