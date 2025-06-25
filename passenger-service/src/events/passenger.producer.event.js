const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

class PassengerEventProducer {
    /**
     * Publish user.deleted event
     * @param {Object} userData - User data to publish
     */
    async publishUserDeleted(userData) {
        try {
            const message = {
                userId: userData.userId,
                email: userData.email,
                username: userData.username,
                firstName: userData.firstName,
                lastName: userData.lastName,
                deletedAt: new Date().toISOString(),
                source: 'passenger-service'
            };

            await publish(
                process.env.USER_DELETED_TOPIC || 'user.deleted',
                userData.userId,
                message
            );
            
            logger.info('User deleted event published successfully', {
                userId: userData.userId,
                email: userData.email,
                topic: process.env.USER_DELETED_TOPIC || 'user.deleted',
                service: 'passenger-service',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to publish user deleted event', {
                error: error.message,
                userId: userData.userId,
                service: 'passenger-service',
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Publish passenger.deleted event
     * @param {Object} passengerData - Passenger data to publish
     */
    async publishPassengerDeleted(passengerData) {
        try {
            const message = {
                passengerId: passengerData.passengerId,
                userId: passengerData.userId,
                email: passengerData.email,
                username: passengerData.username,
                firstName: passengerData.firstName,
                lastName: passengerData.lastName,
                deletedAt: new Date().toISOString(),
                source: 'passenger-service'
            };

            await publish(
                process.env.PASSENGER_DELETED_TOPIC || 'passenger.deleted',
                passengerData.userId,
                message
            );
            
            logger.info('Passenger deleted event published successfully', {
                passengerId: passengerData.passengerId,
                userId: passengerData.userId,
                topic: process.env.PASSENGER_DELETED_TOPIC || 'passenger.deleted',
                service: 'passenger-service',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to publish passenger deleted event', {
                error: error.message,
                passengerId: passengerData.passengerId,
                userId: passengerData.userId,
                service: 'passenger-service',
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Publish passenger.updated event
     * @param {Object} passengerData - Updated passenger data
     */
    async publishPassengerUpdated(passengerData) {
        try {
            const message = {
                passengerId: passengerData.passengerId,
                userId: passengerData.userId,
                email: passengerData.email,
                username: passengerData.username,
                firstName: passengerData.firstName,
                lastName: passengerData.lastName,
                phoneNumber: passengerData.phoneNumber,
                updatedAt: new Date().toISOString(),
                source: 'passenger-service'
            };

            await publish(
                process.env.PASSENGER_UPDATED_TOPIC || 'passenger.updated',
                passengerData.userId,
                message
            );
            
            logger.info('Passenger updated event published successfully', {
                passengerId: passengerData.passengerId,
                userId: passengerData.userId,
                service: 'passenger-service',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to publish passenger updated event', {
                error: error.message,
                passengerId: passengerData.passengerId,
                userId: passengerData.userId,
                service: 'passenger-service',
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
}

module.exports = new PassengerEventProducer(); 