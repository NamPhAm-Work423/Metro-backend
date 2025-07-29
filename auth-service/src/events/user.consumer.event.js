const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');
const keyService = require('../services/key.service');

class UserEventConsumer {
    constructor() {
        this.eventConsumer = null;
    }

    /**
     * Handle user.deleted events
     * @param {Object} payload - The event payload
     */
    async handleUserDeletedEvent(payload) {
        try {
            logger.info('Processing user.deleted event', { 
                userId: payload.userId,
                source: payload.source 
            });

            // Import User model and userService to avoid circular dependency
            const User = require('../models/user.model');
            const userService = require('../services/user.service');

            // Delete user from Auth Service database
            await userService.deleteUserByUserId(payload.userId);

            // Revoke all API keys for the user
            await keyService.revokeAllUserKeys(payload.userId);

            logger.info('User deletion processed successfully in Auth Service', {
                userId: payload.userId,
                email: payload.email,
                source: payload.source
            });

        } catch (error) {
            logger.error('Error handling user.deleted event', { 
                error: error.message, 
                stack: error.stack,
                payload: JSON.stringify(payload)
            });
        }
    }

    /**
     * Handle passenger.deleted events
     * @param {Object} payload - The event payload
     */
    async handlePassengerDeletedEvent(payload) {
        try {
            logger.info('Processing passenger.deleted event', { 
                passengerId: payload.data?.passengerId,
                userId: payload.data?.userId,
                source: payload.source 
            });

            // Import User model and userService to avoid circular dependency
            const User = require('../models/user.model');
            const userService = require('../services/user.service');

            // Delete user from Auth Service database
            await userService.deleteUserByUserId(payload.data.userId);

            // Revoke all API keys for the user
            await keyService.revokeAllUserKeys(payload.data.userId);

            logger.info('Passenger deletion processed successfully in Auth Service', {
                passengerId: payload.data.passengerId,
                userId: payload.data.userId,
                email: payload.data.email,
                source: payload.source
            });

        } catch (error) {
            logger.error('Error handling passenger.deleted event', { 
                error: error.message, 
                stack: error.stack,
                payload: JSON.stringify(payload)
            });
        }
    }

    /**
     * Handle staff.deleted events
     * @param {Object} payload - The event payload
     */
    async handleStaffDeletedEvent(payload) {
        try {
            logger.info('Processing staff.deleted event', { 
                staffId: payload.data?.staffId,
                userId: payload.data?.userId,
                source: payload.source 
            });

            // Import User model and userService to avoid circular dependency
            const User = require('../models/user.model');
            const userService = require('../services/user.service');

            // Delete user from Auth Service database
            await userService.deleteUserByUserId(payload.data.userId);

            // Revoke all API keys for the user
            await keyService.revokeAllUserKeys(payload.data.userId);

            logger.info('Staff deletion processed successfully in Auth Service', {
                staffId: payload.data.staffId,
                userId: payload.data.userId,
                email: payload.data.email,
                source: payload.source
            });

        } catch (error) {
            logger.error('Error handling staff.deleted event', { 
                error: error.message, 
                stack: error.stack,
                payload: JSON.stringify(payload)
            });
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
            logger.debug('Received Kafka message', { topic, messageData: data });
        } catch (e) {
            logger.error('JSON parse error for Kafka message', { 
                error: e.message,
                messageValue: message.value.toString()
            });
            return;
        }
        
        const payload = data.payload || data;
        
        // Route to appropriate handler based on topic
        if (topic === (process.env.USER_DELETED_TOPIC || 'user.deleted')) {
            await this.handleUserDeletedEvent(payload);
        } else if (topic === (process.env.PASSENGER_DELETED_TOPIC || 'passenger.deleted')) {
            await this.handlePassengerDeletedEvent(payload);
        } else if (topic === (process.env.STAFF_DELETED_TOPIC || 'staff.deleted')) {
            await this.handleStaffDeletedEvent(payload);
        } else {
            logger.warn('Unhandled topic', { topic });
        }
    }

    /**
     * Start consuming user-related events
     */
    async start() {
        const topics = [
            // User events
            process.env.USER_DELETED_TOPIC || 'user.deleted',
            // Passenger events
            process.env.PASSENGER_DELETED_TOPIC || 'passenger.deleted',
            // Staff events
            process.env.STAFF_DELETED_TOPIC || 'staff.deleted'
        ];

        this.eventConsumer = new KafkaEventConsumer({
            clientId: process.env.KAFKA_CLIENT_ID || 'auth-service',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            groupId: process.env.KAFKA_GROUP_ID || 'auth-service-group',
            topics,
            eachMessage: this.processMessage.bind(this)
        });

        await this.eventConsumer.start();
        logger.info('UserEventConsumer started successfully for topics:', topics);
    }

    /**
     * Stop consuming events
     */
    async stop() {
        if (this.eventConsumer) {
            await this.eventConsumer.stop();
            logger.info('UserEventConsumer stopped successfully');
        }
    }
}

module.exports = new UserEventConsumer(); 