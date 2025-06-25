const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');
const { Passenger } = require('../models/index.model');

class UserEventConsumer {
    constructor() {
        this.eventConsumer = null;
    }

    /**
     * Create a passenger profile from user registration event
     * @param {Object} userData - User data from the event
     */
    async createPassengerFromUserEvent(userData) {
        try {
            const {
                userId,
                username,
                firstName,
                lastName,
                phoneNumber,
                dateOfBirth,
                gender,
                address,
                roles
            } = userData;

            // Check if passenger profile already exists
            const exists = await Passenger.findOne({ where: { userId } });
            if (exists) {
                logger.info('Passenger profile already exists', { userId });
                return exists;
            }

            // Create passenger profile
            const passenger = await Passenger.create({
                userId,
                username,
                firstName,
                lastName,
                phoneNumber: phoneNumber || null,
                dateOfBirth: dateOfBirth || null,
                gender: gender || null,
                address: address || null,
                isActive: true
            });

            logger.info('Passenger profile created successfully', { 
                userId, 
                username, 
                passengerId: passenger.passengerId 
            });

            return passenger;

        } catch (err) {
            logger.error('Error creating passenger profile from user event', { 
                error: err.message, 
                stack: err.stack,
                userData: JSON.stringify(userData)
            });
            throw err;
        }
    }

    /**
     * Handle user.created events
     * @param {Object} payload - The event payload
     */
    async handleUserCreatedEvent(payload) {
        try {
            logger.info('Processing user.created event', { 
                userId: payload.userId, 
                roles: payload.roles 
            });
            
            // Only process passenger role
            if (!payload.roles || !Array.isArray(payload.roles) || !payload.roles.includes('passenger')) {
                logger.info('Ignored user.created event - user does not have passenger role', { 
                    userId: payload.userId,
                    roles: payload.roles,
                    hasPassengerRole: payload.roles ? payload.roles.includes('passenger') : false
                });
                return;
            }

            logger.info('User has passenger role, creating passenger profile', {
                userId: payload.userId,
                roles: payload.roles
            });

            // Create passenger profile using business service
            await this.createPassengerFromUserEvent(payload);
            
        } catch (error) {
            logger.error('Error handling user.created event', { 
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
        if (topic === (process.env.USER_CREATED_TOPIC || 'user.created')) {
            await this.handleUserCreatedEvent(payload);
        } else {
            logger.warn('Unhandled topic', { topic });
        }
    }

    /**
     * Start consuming user-related events
     */
    async start() {
        const topics = [
            process.env.USER_CREATED_TOPIC || 'user.created'
        ];

        this.eventConsumer = new KafkaEventConsumer({
            clientId: process.env.KAFKA_CLIENT_ID || 'passenger-service',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            groupId: process.env.KAFKA_GROUP_ID || 'passenger-service-group',
            topics,
            eachMessage: this.processMessage.bind(this)
        });

        await this.eventConsumer.start();
        logger.info('UserEventConsumer started successfully');
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