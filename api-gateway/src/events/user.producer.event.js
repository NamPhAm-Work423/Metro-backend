const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');
class UserEventProducer {
    /**
     * Publish user.created event
     * @param {Object} userData - User data to publish
     */
    async publishUserCreated(userData) {
        try {
            await publish(
                process.env.USER_CREATED_TOPIC || 'user.created', 
                userData.userId, 
                userData
            );
            
            logger.info('User.created event published successfully', { 
                userId: userData.userId, 
                username: userData.username,
                email: userData.email,
                roles: userData.roles 
            });
        } catch (error) {
            logger.error('Failed to publish user.created event', { 
                error: error.message,
                userId: userData.userId
            });
            throw error;
        }
    }

    /**
     * Publish user.updated event
     * @param {Object} userData - Updated user data
     */
    async publishUserUpdated(userData) {
        try {
            await publish(
                process.env.USER_UPDATED_TOPIC || 'user.updated', 
                userData.userId, 
                userData
            );
            
            logger.info('User.updated event published successfully', { 
                userId: userData.userId 
            });
        } catch (error) {
            logger.error('Failed to publish user.updated event', { 
                error: error.message,
                userId: userData.userId
            });
            throw error;
        }
    }

    /**
     * Publish user.deleted event
     * @param {Object} userData - Deleted user data
     */
    async publishUserDeleted(userData) {
        try {
            await publish(
                process.env.USER_DELETED_TOPIC || 'user.deleted', 
                userData.userId, 
                userData
            );
            
            logger.info('User.deleted event published successfully', { 
                userId: userData.userId 
            });
        } catch (error) {
            logger.error('Failed to publish user.deleted event', { 
                error: error.message,
                userId: userData.userId
            });
            throw error;
        }
    }
    /** 
     * Publish user.login event
     * @param {Object} userData - User login data
     */
    async publishUserLogin(userData) {
        try {
            await publish(
                process.env.USER_LOGIN_TOPIC || 'user.login', 
                userData.userId, 
                userData
            );
            
            logger.info('User.login event published successfully', { 
                userId: userData.userId,
                username: userData.username
            });
        } catch (error) {
            logger.error('Failed to publish user.login event', { 
                error: error.message,
                userId: userData.userId
            });
            throw error;
        }
    }
}

module.exports = new UserEventProducer(); 