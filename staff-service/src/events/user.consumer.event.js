const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');
const { Staff } = require('../models/index.model');

class UserEventConsumer {
    constructor() {
        this.eventConsumer = null;
    }

    /**
     * Create a staff profile from user registration event
     * @param {Object} userData - User data from the event
     */
    async createStaffFromUserEvent(userData) {
        try {
            const {
                userId,
                username,
                firstName,
                lastName,
                phoneNumber,
                dateOfBirth,
                roles
            } = userData;

            // Check if staff profile already exists
            const exists = await Staff.findOne({ where: { userId } });
            if (exists) {
                logger.info('Staff profile already exists', { userId });
                return exists;
            }

            // Create staff profile with only model fields
            const staff = await Staff.create({
                userId,
                username,
                firstName,
                lastName,
                phoneNumber: phoneNumber || '000000000', // Default phone with 9 digits (minimum)
                dateOfBirth: dateOfBirth || null,
                isActive: true
            });

            logger.info('Staff profile created successfully', { 
                userId, 
                username, 
                staffId: staff.staffId
            });

            return staff;

        } catch (err) {
            logger.error('Error creating staff profile from user event', { 
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
            // Only process users with staff role - check this FIRST
            if (!payload.roles || !Array.isArray(payload.roles) || !payload.roles.includes('staff')) {
                logger.debug('Ignored user.created event - user does not have staff role', { 
                    userId: payload.userId,
                    roles: payload.roles
                });
                return;
            }

            logger.info('Processing user.created event for staff user', { 
                userId: payload.userId, 
                roles: payload.roles 
            });

            // Create staff profile
            await this.createStaffFromUserEvent(payload);
            
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
            clientId: process.env.KAFKA_CLIENT_ID || 'staff-service',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            groupId: process.env.KAFKA_GROUP_ID || 'staff-service-group',
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