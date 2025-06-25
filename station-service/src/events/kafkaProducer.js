const { Kafka } = require('kafkajs');
const { logger } = require('../config/logger');
require('dotenv').config();

// Create Kafka instance
const kafka = Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'station-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    connectionTimeout: 10000,
    requestTimeout: 30000,
    retry: {
        retries: 5,
        initialRetryTime: 1000,
        maxRetryTime: 30000
    }
});

const producer = kafka.producer();
const admin = kafka.admin();
let connected = false;
const ensuredTopics = new Set();

/**
 * Ensure topic exists before publishing
 * @param {string} topic - Topic name
 */
async function ensureTopicExists(topic) {
    if (ensuredTopics.has(topic)) return;
    
    try {
        await admin.connect();
        const topics = await admin.listTopics();
        
        if (!topics.includes(topic)) {
            const replication = parseInt(process.env.KAFKA_REPLICATION_FACTOR || '1', 10);
            await admin.createTopics({
                topics: [{ 
                    topic, 
                    numPartitions: 1, 
                    replicationFactor: replication 
                }],
                waitForLeaders: true
            });
            logger.info('Topic created successfully', { topic });
        }
        
        await admin.disconnect();
        ensuredTopics.add(topic);
        
    } catch (error) {
        logger.error('Error ensuring topic exists', {
            topic,
            error: error.message
        });
        throw error;
    }
}

/**
 * Connect producer if not already connected
 */
async function connectIfNeeded() {
    if (!connected) {
        try {
            await producer.connect();
            connected = true;
            logger.info('Kafka producer connected successfully');
        } catch (error) {
            logger.error('Error connecting Kafka producer', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

/**
 * Publish station event to Kafka
 * @param {string} eventType - Type of event (CREATED, UPDATED, DELETED)
 * @param {Object} stationData - Station data
 * @param {string} userId - User ID who performed the action
 */
async function publishStationEvent(eventType, stationData, userId = null) {
    const topic = process.env.STATION_EVENTS_TOPIC || 'station-events';
    
    const message = {
        eventType,
        timestamp: new Date().toISOString(),
        source: 'station-service',
        userId,
        data: stationData
    };

    try {
        await publish(topic, stationData.stationId, message);
        
        logger.info('Station event published successfully', {
            eventType,
            stationId: stationData.stationId,
            stationCode: stationData.stationCode,
            userId,
            topic
        });
        
    } catch (error) {
        logger.error('Error publishing station event', {
            eventType,
            stationId: stationData.stationId,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Publish message to a Kafka topic
 * @param {string} topic - Kafka topic
 * @param {string|number|null} key - Message key
 * @param {object} message - Payload object (will be JSON.stringified)
 */
async function publish(topic, key, message) {
    try {
        // Ensure topic exists to prevent leader election errors
        await ensureTopicExists(topic);
        await connectIfNeeded();
        
        await producer.send({
            topic,
            messages: [
                {
                    key: key !== undefined && key !== null ? String(key) : undefined,
                    value: JSON.stringify(message),
                    timestamp: Date.now().toString()
                }
            ]
        });
        
        logger.debug('Message published to Kafka', { topic, key });
        
    } catch (error) {
        logger.error('Error publishing message to Kafka', {
            topic,
            key,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Publish station status change event (for route service)
 * @param {string} stationId - Station ID
 * @param {boolean} isActive - New active status
 * @param {string} reason - Reason for status change
 * @param {string} userId - User ID who made the change
 */
async function publishStationStatusChange(stationId, isActive, reason = null, userId = null) {
    const topic = process.env.STATION_STATUS_TOPIC || 'station-status-changes';
    
    const message = {
        eventType: 'STATION_STATUS_CHANGED',
        timestamp: new Date().toISOString(),
        source: 'station-service',
        userId,
        data: {
            stationId,
            isActive,
            reason,
            changedAt: new Date().toISOString()
        }
    };

    try {
        await publish(topic, stationId, message);
        
        logger.info('Station status change event published', {
            stationId,
            isActive,
            reason,
            userId,
            topic
        });
        
    } catch (error) {
        logger.error('Error publishing station status change event', {
            stationId,
            isActive,
            error: error.message
        });
        throw error;
    }
}

/**
 * Gracefully disconnect the producer
 */
async function disconnect() {
    try {
        if (connected) {
            await producer.disconnect();
            connected = false;
            logger.info('Kafka producer disconnected successfully');
        }
    } catch (error) {
        logger.error('Error disconnecting Kafka producer', {
            error: error.message
        });
    }
}

// Graceful shutdown handlers
process.on('SIGINT', disconnect);
process.on('SIGTERM', disconnect);

module.exports = {
    publish,
    publishStationEvent,
    publishStationStatusChange,
    disconnect
}; 