const { Kafka } = require('kafkajs');
const { logger } = require('../config/logger');
require('dotenv').config();

// Brokers list comes from env or default to localhost
const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'ticket-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

const producer = kafka.producer();
const admin = kafka.admin();
let connected = false;
const ensuredTopics = new Set();

async function ensureTopicExists(topic) {
    // In test environment, skip admin connections to avoid external network calls and logs
    if (process.env.NODE_ENV === 'test') {
        ensuredTopics.add(topic);
        return;
    }
    if (ensuredTopics.has(topic)) return;
    await admin.connect();
    const topics = await admin.listTopics();
    if (!topics.includes(topic)) {
        const replication = parseInt(process.env.KAFKA_REPLICATION_FACTOR || '1', 10);
        await admin.createTopics({
            topics: [{ topic, numPartitions: 1, replicationFactor: replication }],
            waitForLeaders: true
        });
    }
    await admin.disconnect();
    ensuredTopics.add(topic);
}

async function connectIfNeeded() {
    // Do not connect Kafka producer in tests; tests stub publish paths
    if (process.env.NODE_ENV === 'test') {
        connected = true;
        return;
    }
    if (!connected) {
        await producer.connect();
        connected = true;
        logger.info('Kafka producer connected successfully', {
            service: 'ticket-service',
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Publish message to a Kafka topic.
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
                    timestamp: Date.now()
                }
            ]
        });
        
        logger.debug('Message published successfully', {
            topic,
            key,
            service: 'ticket-service',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Failed to publish message', {
            error: error.message,
            topic,
            key,
            service: 'ticket-service',
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

/**
 * Gracefully disconnect the producer
 */
async function disconnect() {
    try {
        if (process.env.NODE_ENV === 'test') {
            connected = false;
            return;
        }
        if (connected) {
            await producer.disconnect();
            connected = false;
            logger.info('Kafka producer disconnected successfully', {
                service: 'ticket-service',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        logger.error('Error disconnecting Kafka producer', {
            error: error.message,
            service: 'ticket-service',
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = {
    publish,
    disconnect
}; 