const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

class PassengerEventProducer {
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
                source: 'user-service'
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
                service: 'user-service',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to publish passenger deleted event', {
                error: error.message,
                passengerId: passengerData.passengerId,
                userId: passengerData.userId,
                service: 'user-service',
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
                source: 'user-service'
            };

            await publish(
                process.env.PASSENGER_UPDATED_TOPIC || 'passenger.updated',
                passengerData.userId,
                message
            );
            
            logger.info('Passenger updated event published successfully', {
                passengerId: passengerData.passengerId,
                userId: passengerData.userId,
                service: 'user-service',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to publish passenger updated event', {
                error: error.message,
                passengerId: passengerData.passengerId,
                userId: passengerData.userId,
                service: 'user-service',
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
}

module.exports = new PassengerEventProducer(); 