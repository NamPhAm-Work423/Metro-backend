const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

class PassengerEventProducer {
    /**
     * Publish passenger.deleted event
     * @param {Object} passengerData - Passenger data to publish
     */
    async publishPassengerDeleted(passengerData) {
        try {
            const eventData = {
                eventType: 'passenger.deleted',
                timestamp: new Date().toISOString(),
                data: {
                    passengerId: passengerData.passengerId,
                    userId: passengerData.userId,
                    email: passengerData.email,
                    deletedAt: new Date().toISOString()
                }
            };

            await publish('passenger.deleted', passengerData.passengerId, eventData);
            logger.info('Published passenger.deleted event', { 
                passengerId: passengerData.passengerId,
                userId: passengerData.userId 
            });
        } catch (error) {
            logger.error('Failed to publish passenger.deleted event', { 
                error: error.message,
                passengerId: passengerData.passengerId 
            });
            throw error;
        }
    }

    /**
     * Publish passenger-cache-sync event
     * @param {Object} passengerData - Passenger data to sync to ticket service cache
     */
    async publishPassengerCacheSync(passengerData) {
        try {
            const eventData = {
                eventType: 'passenger-cache-sync',
                timestamp: new Date().toISOString(),
                data: {
                    passengerId: passengerData.passengerId,
                    userId: passengerData.userId,
                    username: passengerData.username,
                    firstName: passengerData.firstName,
                    lastName: passengerData.lastName,
                    fullName: `${passengerData.firstName || ''} ${passengerData.lastName || ''}`.trim(),
                    phoneNumber: passengerData.phoneNumber,
                    dateOfBirth: passengerData.dateOfBirth,
                    gender: passengerData.gender,
                    address: passengerData.address,
                    isActive: passengerData.isActive,
                    updatedAt: new Date().toISOString()
                }
            };

            await publish('passenger-cache-sync', passengerData.passengerId, eventData);
            logger.info('Published passenger-cache-sync event', { 
                passengerId: passengerData.passengerId,
                userId: passengerData.userId 
            });
        } catch (error) {
            logger.error('Failed to publish passenger-cache-sync event', { 
                error: error.message,
                passengerId: passengerData.passengerId 
            });
            throw error;
        }
    }
}

module.exports = new PassengerEventProducer(); 