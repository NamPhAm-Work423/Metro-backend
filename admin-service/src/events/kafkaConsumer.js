const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'admin-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    connectionTimeout: 30000,
    requestTimeout: 25000,
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

const consumer = kafka.consumer({ 
    groupId: process.env.KAFKA_GROUP_ID || 'admin-service-group',
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
 * Handle user.created events for admin
 * @param {Object} payload - The event payload
 */
async function handleUserCreatedEvent(payload) {
    try {
        console.log('Processing user.created event', { userId: payload.userId, roles: payload.roles });
        
        // Only process admin role
        if (!payload.roles || !payload.roles.includes('admin')) {
            console.log('Ignored user.created without admin role', { userId: payload.userId });
            return;
        }

        // TODO: Call admin service to create admin profile
        console.log('Admin profile creation would happen here', { userId: payload.userId });
        
    } catch (err) {
        console.error('Error handling user.created event', { 
            error: err.message, 
            stack: err.stack,
            payload: JSON.stringify(payload)
        });
    }
}

/**
 * Process incoming Kafka messages
 */
async function processMessage(messageData) {
    const { topic, partition, message } = messageData;
    
    if (!message.value) {
        console.warn('Received empty message', { topic, partition });
        return;
    }
    
    let data;
    try {
        data = JSON.parse(message.value.toString());
        console.log('Received Kafka message', { topic, messageData: data });
    } catch (e) {
        console.error('JSON parse error for Kafka message', { 
            error: e.message,
            messageValue: message.value.toString()
        });
        return;
    }
    
    const payload = data.payload || data;
    
    if (topic === (process.env.USER_CREATED_TOPIC || 'user.created')) {
        await handleUserCreatedEvent(payload);
    } else {
        console.warn('Unhandled topic', { topic });
    }
}

/**
 * Start the Kafka consumer
 */
async function start() {
    try {
        await consumer.connect();
        console.log('Admin service Kafka consumer connected');
        
        await consumer.subscribe({ 
            topic: process.env.USER_CREATED_TOPIC || 'user.created', 
            fromBeginning: false 
        });
        
        await consumer.run({
            eachMessage: processMessage
        });

        console.log('Admin service Kafka consumer is running');
    } catch (error) {
        console.error('Kafka consumer error', error.message);
        throw error;
    }
}

/**
 * Stop the Kafka consumer
 */
async function stop() {
    try {
        await consumer.disconnect();
        console.log('Admin service Kafka consumer disconnected');
    } catch (error) {
        console.error('Error disconnecting Kafka consumer', error.message);
    }
}

module.exports = {
    start,
    stop
}; 