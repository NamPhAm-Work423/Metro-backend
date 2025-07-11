const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const PassengerCacheService = require('../services/passengerCache.service');
const { logger } = require('../config/logger');

class PassengerCacheConsumer {
    constructor() {
        this.eventConsumer = null;
    }

    /**
     * Handle passenger cache sync events
     * @param {Object} eventData - The event data
     */
    async handlePassengerCacheSync(eventData) {
        // Support both old format (eventData.passenger) and new format (eventData.data)
        const passenger = eventData.passenger || eventData.data;
        
        if (!passenger || !passenger.passengerId) {
            logger.warn('Invalid passenger cache sync event data', eventData);
            return;
        }

        const success = await PassengerCacheService.setPassenger(
            passenger.passengerId, 
            passenger
        );

        if (success) {
            logger.info(`Passenger cache synced from user-service: ${passenger.passengerId}`, {
                syncReason: eventData.syncReason || 'manual-sync',
                source: eventData.source,
                eventType: eventData.eventType
            });
        } else {
            logger.error(`Failed to sync passenger cache: ${passenger.passengerId}`);
        }
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
            logger.info(`Received passenger cache event: ${topic}`, {
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
        if (topic === 'passenger-cache-sync') {
            await this.handlePassengerCacheSync(payload);
        } else {
            logger.warn(`Unknown passenger cache event topic: ${topic}`);
        }
    }

    /**
     * Start consuming passenger cache events
     */
    async start() {
        try {
            const topics = ['passenger-cache-sync'];

            this.eventConsumer = new KafkaEventConsumer({
                clientId: process.env.KAFKA_CLIENT_ID || 'ticket-service',
                brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
                groupId: 'ticket-service-passenger-cache',
                topics,
                eachMessage: this.processMessage.bind(this)
            });

            await this.eventConsumer.start();
            logger.info('Passenger cache consumer started successfully');
        } catch (error) {
            logger.error('Failed to start passenger cache consumer:', error);
            throw error;
        }
    }

    /**
     * Stop consuming events
     */
    async stop() {
        try {
            if (this.eventConsumer) {
                await this.eventConsumer.stop();
                logger.info('Passenger cache consumer stopped successfully');
            }
        } catch (error) {
            logger.error('Error stopping passenger cache consumer:', error);
        }
    }

    // Health check method
    async isHealthy() {
        return this.eventConsumer && this.eventConsumer.consumer && !this.eventConsumer.consumer.paused();
    }

    // Get consumer stats
    async getStats() {
        try {
            if (!this.eventConsumer || !this.eventConsumer.consumer) {
                return { status: 'disconnected', topics: ['passenger-cache-sync'] };
            }

            return {
                status: 'connected',
                topics: ['passenger-cache-sync'],
                paused: this.eventConsumer.consumer.paused()
            };
        } catch (error) {
            logger.error('Error getting consumer stats:', error);
            return { status: 'error', error: error.message };
        }
    }
}

module.exports = new PassengerCacheConsumer(); 