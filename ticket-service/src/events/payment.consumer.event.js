const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');
const ticketController = require('../controllers/ticket.controller');
const { paymentCache } = require('../cache/paymentCache');

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
            await ticketController.processPaymentCompletedEvent(eventData);
        } catch (error) {
            logger.error('Error processing payment completed event', { error: error.message, eventData });
            throw error;
        }
    }

    /**
     * Handle payment failed event from payment service
     * @param {Object} eventData - The payment failed event data
     */
    async handlePaymentFailed(eventData) {
        try {
            await ticketController.processPaymentFailedEvent(eventData);
        } catch (error) {
            logger.error('Error processing payment failed event', { error: error.message, eventData });
        }
    }

    /**
     * Handle payment cancelled event from payment service
     * @param {Object} eventData - The payment cancelled event data
     */
    async handlePaymentCancelled(eventData) {
        try {
            await ticketController.processPaymentCancelledEvent(eventData);
        } catch (error) {
            logger.error('Error processing payment cancelled event', { error: error.message, eventData });
        }
    }

    /**
     * Handle payment ready event from payment service
     * @param {Object} eventData - The payment ready event data
     */
    async handlePaymentReady(eventData) {
        try {
            await ticketController.processPaymentReadyEvent(eventData);
        } catch (error) {
            logger.error('Error processing payment ready event', { error: error.message, eventData });
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