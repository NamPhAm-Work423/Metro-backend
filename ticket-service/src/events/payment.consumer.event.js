const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');
const { Ticket } = require('../models/index.model');

/**
 * Payment consumer event for ticket service
 * This class is used to consume payment events from Kafka
 * and update ticket with payment information including payment URL
 */
class PaymentConsumer {
    constructor() {
        this.eventConsumer = null;
        this.paymentCache = new Map(); // In-memory cache for payment data
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
                status 
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
                timestamp: Date.now()
            });

            // Also store by ticket ID for fallback
            this.paymentCache.set(ticketId, {
                ticketId,
                paymentId,
                paymentUrl,
                paymentMethod,
                paypalOrderId,
                status,
                timestamp: Date.now()
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
        const data = this.paymentCache.get(key);
        if (data) {
            // Check if data is not too old (5 minutes)
            const age = Date.now() - data.timestamp;
            if (age < 300000) { // 5 minutes
                return data;
            } else {
                // Remove old data
                this.paymentCache.delete(key);
            }
        }
        return null;
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
        if (topic === 'ticket.payment_ready') {
            await this.handlePaymentReady(payload);
        } else {
            logger.warn(`Unknown payment event topic: ${topic}`);
        }
    }

    /**
     * Start consuming payment events
     */
    async start() {
        try {
            const topics = ['ticket.payment_ready'];

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