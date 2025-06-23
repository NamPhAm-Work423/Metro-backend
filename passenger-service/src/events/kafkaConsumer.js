const { Kafka } = require('kafkajs');
const { Passenger } = require('../models/index.model');
require('dotenv').config();

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'passenger-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'passenger-service-group' });

async function handleUserCreated(eventPayload) {
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
        } = eventPayload;

        // Only process if role includes 'passenger'
        if (!roles || !roles.includes('passenger')) {
            return; // Ignore non-passenger users
        }

        // Check if passenger profile already exists
        const existing = await Passenger.findOne({ where: { userId } });
        if (existing) {
            return; // Already exists
        }

        // Create passenger with minimal info (others can be updated later)
        await Passenger.create({
            userId,
            username,
            firstName,
            lastName,
            phoneNumber: phoneNumber || '0000000000', // placeholder if absent
            dateOfBirth: dateOfBirth || null,
            gender: gender || null,
            address: address || null,
            isActive: true
        });
        console.log(`[Kafka] Passenger profile created for user ${userId}`);
    } catch (err) {
        console.error('[Kafka] Error processing user.created event:', err.message);
    }
}

async function start() {
    await consumer.connect();
    await consumer.subscribe({ topic: process.env.USER_CREATED_TOPIC || 'user.created', fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            try {
                if (!message.value) return;
                const payloadStr = message.value.toString();
                const event = JSON.parse(payloadStr);
                // When using producer util, message might be wrapped with payload OR be payload itself
                if (event) {
                    if (event.payload) {
                        await handleUserCreated(event.payload);
                    } else {
                        await handleUserCreated(event);
                    }
                }
            } catch (err) {
                console.error('[Kafka] Failed to handle message:', err.message);
            }
        }
    });
}

module.exports = {
    start
}; 