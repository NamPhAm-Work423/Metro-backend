// kafkaProducer.js
const { Kafka } = require('kafkajs');
require('dotenv').config();

// Brokers list comes from env or default to localhost
const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'api-gateway',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const producer = kafka.producer();
let connected = false;

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