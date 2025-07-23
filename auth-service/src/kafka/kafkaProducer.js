// kafkaProducer.js
const { Kafka } = require('kafkajs');
require('dotenv').config();

// Brokers list comes from env or default to localhost
const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'auth-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const producer = kafka.producer();
const admin = kafka.admin();
let connected = false;
const ensuredTopics = new Set();

async function ensureTopicExists(topic) {
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
    if (!connected) {
        await producer.connect();
        connected = true;
    }
}

/**
 * Publish message to a Kafka topic.
 * @param {string} topic - Kafka topic
 * @param {string|number|null} key - Message key
 * @param {object} message - Payload object (will be JSON.stringified)
 */
async function publish(topic, key, message) {
    // Ensure topic exists to prevent leader election errors
    await ensureTopicExists(topic);
    await connectIfNeeded();
    await producer.send({
        topic,
        messages: [
            {
                key: key !== undefined && key !== null ? String(key) : undefined,
                value: JSON.stringify(message)
            }
        ]
    });
}

module.exports = {
    publish
}; 