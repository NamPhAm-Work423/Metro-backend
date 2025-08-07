const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');
const { Passenger, Staff } = require('../models/index.model');
const passengerService = require('../services/passenger.service');
const { getClient } = require('../config/redis');
const PassengerCacheService = require('../../../../libs/cache/passenger.cache');

const SERVICE_PREFIX = process.env.REDIS_KEY_PREFIX || 'service:';

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

            // Create staff profile
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
            logger.info('Processing user.created event', { 
                userId: payload.userId, 
                roles: payload.roles 
            });
            
            if (!payload.roles || !Array.isArray(payload.roles)) {
                logger.warn('User created event has no roles defined', { 
                    userId: payload.userId 
                });
                return;
            }

            // Create profiles based on user roles
            const createPromises = [];

            if (payload.roles.includes('admin')) {
                logger.info('User has admin role - admin profiles must be created manually by existing admins', {
                    userId: payload.userId
                });
                // Admin profiles are not auto-created from user registration events for security reasons
            }

            if (payload.roles.includes('passenger')) {
                logger.info('User has passenger role, create passenger profile', {
                    userId: payload.userId
                });
                createPromises.push(this.createPassengerFromUserEvent(payload));
            }

            if (payload.roles.includes('staff')) {
                logger.info('User has staff role, creating staff profile', {
                    userId: payload.userId
                });
                createPromises.push(this.createStaffFromUserEvent(payload));
            }

            // Execute all profile creation in parallel
            if (createPromises.length > 0) {
                await Promise.all(createPromises);
                logger.info('All user profiles created successfully', {
                    userId: payload.userId,
                    roles: payload.roles,
                    profilesCreated: createPromises.length
                });
            } else {
                logger.info('No matching roles found for profile creation', {
                    userId: payload.userId,
                    roles: payload.roles
                });
            }
            
        } catch (error) {
            logger.error('Error handling user.created event', { 
                error: error.message, 
                stack: error.stack,
                payload: JSON.stringify(payload)
            });
        }
    }
    /**
     * Publish user.login event
     * @param {Object} userData - New user data
     */
    async handleUserLoginEvent(userData) {
        try {
            logger.info('Handling user.login event', {
                userId: userData.userId,
                username: userData.username,
                roles: userData.roles
            });
    
            if (!userData.roles || !Array.isArray(userData.roles)) {
                logger.warn('User login event has no roles defined', {
                    userId: userData.userId
                });
                return;
            }
            
            // For admin users, create a virtual passenger cache without requiring passenger profile
            if (userData.roles.includes('admin')) {
                logger.info('Admin user detected, creating virtual passenger cache', {
                    userId: userData.userId
                });
                
                const redisClient = getClient();
                const passengerCache = new PassengerCacheService(redisClient, logger, `${SERVICE_PREFIX}user:passenger:`);
                
                const adminPassengerData = {
                    passengerId: process.env.ADMIN_PASSENGER_ID, // Use userId as passengerId for admin
                    userId: userData.userId,
                    firstName: 'Admin',
                    lastName: 'User',
                    phoneNumber: '0000000000',
                    dateOfBirth: null,
                    gender: null,
                    updatedAt: new Date().toISOString()
                };
                
                await passengerCache.setPassenger(adminPassengerData);
                logger.info('Admin passenger cache successfully synced on login', {
                    passengerId: adminPassengerData.passengerId,
                    userId: adminPassengerData.userId,
                    syncSource: 'admin-login-event'
                });
                return;
            }
            
            // For regular passengers, check if they have passenger role
            if (!userData.roles.includes('passenger')) {
                logger.info('User is not a passenger, skipping passenger cache sync', {
                    userId: userData.userId
                });
                return;
            }
    
            const passenger = await passengerService.getPassengerByUserId(userData.userId);
    
            if (!passenger) {
                logger.error('Passenger profile not found during login event', {
                    userId: userData.userId
                });
                return;
            }
    
            const redisClient = getClient();
            const passengerCache = new PassengerCacheService(redisClient, logger, `${SERVICE_PREFIX}user:passenger:`);
    
            const passengerData = {
                passengerId: passenger.passengerId,
                userId: passenger.userId,
                firstName: passenger.firstName,
                lastName: passenger.lastName,
                phoneNumber: passenger.phoneNumber,
                dateOfBirth: passenger.dateOfBirth,
                gender: passenger.gender,
                updatedAt: new Date().toISOString()
            };
    
            await passengerCache.setPassenger(passengerData);
            logger.info('Passenger cache successfully synced on login', {
                passengerId: passenger.passengerId,
                userId: passenger.userId,
                syncSource: 'user-login-event'
            });
    
            
    
        } catch (error) {
            logger.error('Error during handleUserLoginEvent', {
                error: error.message,
                stack: error.stack,
                userData
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
        
        const handledTopics = [];

        if (topic === (process.env.USER_CREATED_TOPIC || 'user.created')) {
            await this.handleUserCreatedEvent(payload);
            handledTopics.push('user.created');
        }

        if (topic === (process.env.USER_LOGIN_TOPIC || 'user.login')) {
            await this.handleUserLoginEvent(payload);
            handledTopics.push('user.login');
        }

        if (handledTopics.length === 0) {
            logger.warn('Unhandled topic', { topic });
        }
    }

    /**
     * Start consuming user-related events
     */
    async start() {
        const topics = [
            process.env.USER_CREATED_TOPIC || 'user.created',
            process.env.USER_LOGIN_TOPIC || 'user.login'
        ];

        this.eventConsumer = new KafkaEventConsumer({
            clientId: process.env.KAFKA_CLIENT_ID || 'user-service',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            groupId: process.env.KAFKA_GROUP_ID || 'user-service-group',
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