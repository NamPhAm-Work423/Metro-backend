const { Kafka } = require('kafkajs');
const { Passenger } = require('../models/index.model');
require('dotenv').config();

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'passenger-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

// Use a dedicated consumer group
const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'passenger-service-group' });

async function handleUserCreated(payload) {
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
        } = payload;

        // Only process passenger role
        if (!roles || !roles.includes('passenger')) return;

        const exists = await Passenger.findOne({ where: { userId } });
        if (exists) return;

        await Passenger.create({
            userId,
            username,
            firstName,
            lastName,
            phoneNumber: phoneNumber || '0000000000',
            dateOfBirth: dateOfBirth || null,
            gender: gender || null,
            address: address || null,
            isActive: true
        });
        console.log(`[Kafka] Passenger created for user ${userId}`);
    } catch (err) {
        console.error('[Kafka] handleUserCreated error:', err.message);
    }
}

async function start() {
    await consumer.connect();
    await consumer.subscribe({ topic: process.env.USER_CREATED_TOPIC || 'user.created', fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ message }) => {
            if (!message.value) return;
            let data;
            try {
                data = JSON.parse(message.value.toString());
            } catch (e) {
                console.error('[Kafka] JSON parse error:', e.message);
                return;
            }
            const payload = data.payload || data; // unwrap if necessary
            await handleUserCreated(payload);
        }
    });
}

module.exports = { start }; 