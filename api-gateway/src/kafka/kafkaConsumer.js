const { Kafka } = require('kafkajs');
const { logger } = require('../config/logger');

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
        this.kafka = new Kafka({ clientId, brokers });
        this.consumer = this.kafka.consumer({ groupId });
        this.running = false;
    }

    /**
     * Start the consumer and begin listening for messages.
     */
    async start() {
        if (this.running) {
            logger.debug('KafkaEventConsumer already running');
            return;
        }
        await this.consumer.connect();
        for (const topic of this.topics) {
            await this.consumer.subscribe({ topic, fromBeginning: false });
            logger.info(`KafkaEventConsumer subscribed to topic ${topic}`);
        }
        await this.consumer.run({ eachMessage: this.eachMessage });
        this.running = true;
        logger.info('KafkaEventConsumer started successfully');
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

module.exports = { KafkaEventConsumer }; 