const { Kafka } = require('kafkajs');
const passengerService = require('../services/passenger.service');
require('dotenv').config();
const { logger } = require('../config/logger');

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'passenger-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    // Add connection retry and timeout configurations
    connectionTimeout: 30000,
    requestTimeout: 25000,
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

// Use a dedicated consumer group
const consumer = kafka.consumer({ 
    groupId: process.env.KAFKA_GROUP_ID || 'passenger-service-group',
    // Add consumer configurations for better reliability
    sessionTimeout: 30000,
    rebalanceTimeout: 60000,
    heartbeatInterval: 3000,
    maxWaitTimeInMs: 5000,
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

/**
 * Handle user.created events
 * @param {Object} payload - The event payload
 */
async function handleUserCreatedEvent(payload) {
    try {
        logger.info('Processing user.created event', { userId: payload.userId, roles: payload.roles });
        
        // Only process passenger role
        if (!payload.roles || !payload.roles.includes('passenger')) {
            logger.debug('Ignored user.created without passenger role', { userId: payload.userId });
            return;
        }

        // Call the business service to handle passenger creation
        await passengerService.createPassengerFromUserEvent(payload);
        
    } catch (err) {
        logger.error('Error handling user.created event', { 
            error: err.message, 
            stack: err.stack,
            payload: JSON.stringify(payload)
        });
    }
}

/**
 * Process incoming Kafka messages
 * @param {Object} messageData - Raw message data from Kafka
 */
async function processMessage(messageData) {
    const { topic, partition, message } = messageData;
    
    if (!message.value) {
        logger.warn('Received empty message', { topic, partition });
        return;
    }
    
    let data;
    try {
        data = JSON.parse(message.value.toString());
        logger.debug('Received Kafka message', { topic, messageData: data });
    } catch (e) {
        logger.error('JSON parse error for Kafka message', { 
            error: e.message,
            messageValue: message.value.toString()
        });
        return;
    }
    
    const payload = data.payload || data; // unwrap if necessary
    
    // Route to appropriate handler based on topic
    if (topic === (process.env.USER_CREATED_TOPIC || 'user.created')) {
        await handleUserCreatedEvent(payload);
    } else {
        logger.warn('Unhandled topic', { topic });
    }
}

/**
 * Start the Kafka consumer
 */
async function start() {
    let retryCount = 0;
    const maxRetries = 10;
    const retryDelay = 5000;

    while (retryCount < maxRetries) {
        try {
            await consumer.connect();
            logger.info('Kafka consumer connected successfully');
            
            await consumer.subscribe({ 
                topic: process.env.USER_CREATED_TOPIC || 'user.created', 
                fromBeginning: false 
            });
            logger.info('Subscribed to topic successfully', { 
                topic: process.env.USER_CREATED_TOPIC || 'user.created' 
            });

            await consumer.run({
                eachMessage: processMessage
            });

            logger.info('Kafka consumer is now running successfully');
            break; // Exit retry loop on success

        } catch (error) {
            retryCount++;
            logger.error('Kafka consumer connection failed', { 
                error: error.message,
                retryCount,
                maxRetries,
                stack: error.stack
            });

            if (retryCount >= maxRetries) {
                logger.error('Max retries reached for Kafka consumer, giving up');
                throw error;
            }

            logger.info('Retrying Kafka connection', { 
                retryCount,
                delayMs: retryDelay 
            });
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    // Add error event handlers for ongoing connection issues
    consumer.on('consumer.crash', (error) => {
        logger.error('Kafka consumer crashed', { error: error.message, stack: error.stack });
        // Attempt to restart after a delay
        setTimeout(() => {
            logger.info('Attempting to restart crashed Kafka consumer');
            start().catch(err => logger.error('Failed to restart consumer', { error: err.message }));
        }, 10000);
    });

    consumer.on('consumer.disconnect', () => {
        logger.warn('Kafka consumer disconnected');
    });

    consumer.on('consumer.connect', () => {
        logger.info('Kafka consumer reconnected');
    });
}

/**
 * Stop the Kafka consumer gracefully
 */
async function stop() {
    try {
        await consumer.disconnect();
        logger.info('Kafka consumer disconnected successfully');
    } catch (error) {
        logger.error('Error disconnecting Kafka consumer', { error: error.message });
    }
}

module.exports = {
    start,
    stop
}; 