const { Kafka } = require('kafkajs');
const { logger } = require('../config/logger');
const { handlePaymentReady } = require('../events/ticket.producer');

/**
 * Generic Kafka consumer wrapper that supports automatic topic subscription
 * and simple start/stop helpers.
 */
class KafkaEventConsumer {
    /**
     * @param {Object} options
     * @param {string} options.clientId - Kafka client ID
     * @param {string[]} options.brokers - Array of broker addresses
     * @param {string} options.groupId - Consumer group ID
     * @param {string[]} options.topics - List of topics to subscribe to
     * @param {Function} options.eachMessage - Callback for each received message
     */
    constructor({ clientId, brokers, groupId, topics, eachMessage }) {
        if (!Array.isArray(brokers) || brokers.length === 0) {
            throw new Error('KafkaEventConsumer requires at least one broker');
        }
        if (!Array.isArray(topics) || topics.length === 0) {
            throw new Error('KafkaEventConsumer requires at least one topic');
        }
        this.topics = topics;
        this.eachMessage = eachMessage;
        
        this.kafka = new Kafka({
            clientId,
            brokers,
            connectionTimeout: 30000,
            requestTimeout: 25000,
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });
        
        this.consumer = this.kafka.consumer({
            groupId,
            sessionTimeout: 30000,
            rebalanceTimeout: 60000,
            heartbeatInterval: 3000,
            maxWaitTimeInMs: 5000,
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });
        
        this.running = false;
        this.retryCount = 0;
        this.maxRetries = 10;
        this.retryDelay = 5000;
    }

    /**
     * Start the consumer and begin listening for messages.
     */
    async start() {
        while (this.retryCount < this.maxRetries) {
            try {
                await this.consumer.connect();
                logger.info('KafkaEventConsumer connected successfully');
                
                for (const topic of this.topics) {
                    await this.consumer.subscribe({ topic, fromBeginning: false });
                    logger.info(`KafkaEventConsumer subscribed to topic ${topic}`);
                }
                
                await this.consumer.run({ eachMessage: this.eachMessage });
                this.running = true;
                logger.info('KafkaEventConsumer started successfully');
                
                this.setupEventHandlers();
                break; // Exit retry loop on success
                
            } catch (error) {
                this.retryCount++;
                logger.error('KafkaEventConsumer connection failed', {
                    error: error.message,
                    retryCount: this.retryCount,
                    maxRetries: this.maxRetries,
                    stack: error.stack
                });

                if (this.retryCount >= this.maxRetries) {
                    logger.error('Max retries reached for KafkaEventConsumer, giving up');
                    throw error;
                }

                logger.info('Retrying KafkaEventConsumer connection', {
                    retryCount: this.retryCount,
                    delayMs: this.retryDelay
                });
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
    }

    /**
     * Set up event handlers for the consumer
     */
    setupEventHandlers() {
        this.consumer.on('consumer.crash', (error) => {
            logger.error('KafkaEventConsumer crashed', { 
                error: error.message, 
                stack: error.stack 
            });
            
            this.running = false;
            // Attempt to restart after a delay
            setTimeout(() => {
                logger.info('Attempting to restart crashed KafkaEventConsumer');
                this.start().catch(err => 
                    logger.error('Failed to restart consumer', { error: err.message })
                );
            }, 10000);
        });

        this.consumer.on('consumer.disconnect', () => {
            logger.warn('KafkaEventConsumer disconnected');
            this.running = false;
        });

        this.consumer.on('consumer.connect', () => {
            logger.info('KafkaEventConsumer reconnected');
            this.running = true;
        });
    }

    /**
     * Gracefully stop the consumer.
     */
    async stop() {
        if (this.running) {
            await this.consumer.disconnect();
            this.running = false;
            logger.info('KafkaEventConsumer stopped successfully');
        }
    }
}

// Legacy consumer for payment events
const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'ticket-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

const consumer = kafka.consumer({ groupId: 'ticket-service-payment-group' });

/**
 * Start Kafka consumer
 */
async function startConsumer() {
    try {
        await consumer.connect();
        
        // Subscribe to payment ready events
        await consumer.subscribe({ 
            topic: 'ticket.payment_ready', 
            fromBeginning: false 
        });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const event = JSON.parse(message.value.toString());
                    
                    logger.info('Received Kafka event', {
                        topic,
                        partition,
                        key: message.key?.toString(),
                        eventType: event.status,
                        eventData: event // Log the full event for debugging
                    });

                    // Handle payment ready events
                    if (topic === 'ticket.payment_ready') {
                        await handlePaymentReady(event);
                    }

                } catch (error) {
                    logger.error('Error processing Kafka message', {
                        topic,
                        partition,
                        error: error.message
                    });
                }
            }
        });

        logger.info('Ticket service Kafka consumer started');
    } catch (error) {
        logger.error('Failed to start Kafka consumer', { error: error.message });
        throw error;
    }
}

/**
 * Stop Kafka consumer
 */
async function stopConsumer() {
    try {
        await consumer.disconnect();
        logger.info('Ticket service Kafka consumer stopped');
    } catch (error) {
        logger.error('Error stopping Kafka consumer', { error: error.message });
    }
}

module.exports = {
    KafkaEventConsumer,
    startConsumer,
    stopConsumer
}; 