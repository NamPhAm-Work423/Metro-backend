const { Kafka } = require('kafkajs');
const { logger } = require('../config/logger');

class KafkaProducer {
    constructor() {
        this.kafka = new Kafka({
            clientId: process.env.KAFKA_CLIENT_ID || 'passenger-service-producer',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });

        this.producer = this.kafka.producer();
        this.isConnected = false;
    }

    async connect() {
        try {
            await this.producer.connect();
            this.isConnected = true;
            logger.info('Kafka producer connected successfully', {
                service: 'passenger-service',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to connect Kafka producer', {
                error: error.message,
                service: 'passenger-service',
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.isConnected) {
                await this.producer.disconnect();
                this.isConnected = false;
                logger.info('Kafka producer disconnected successfully', {
                    service: 'passenger-service',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            logger.error('Error disconnecting Kafka producer', {
                error: error.message,
                service: 'passenger-service',
                timestamp: new Date().toISOString()
            });
        }
    }

    async publishUserDeleted(userData) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const message = {
                userId: userData.userId,
                email: userData.email,
                username: userData.username,
                firstName: userData.firstName,
                lastName: userData.lastName,
                deletedAt: new Date().toISOString(),
                source: 'passenger-service'
            };

            await this.producer.send({
                topic: process.env.USER_DELETED_TOPIC || 'user.deleted',
                messages: [{
                    key: userData.userId,
                    value: JSON.stringify(message),
                    timestamp: Date.now()
                }]
            });

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

    async publishPassengerDeleted(passengerData) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

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

            await this.producer.send({
                topic: process.env.PASSENGER_DELETED_TOPIC || 'passenger.deleted',
                messages: [{
                    key: passengerData.userId,
                    value: JSON.stringify(message),
                    timestamp: Date.now()
                }]
            });

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
}

// Export singleton instance
module.exports = new KafkaProducer(); 