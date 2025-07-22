const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { createAPIToken, hashToken } = require('../helpers/crypto.helper');
const { Key } = require('../models/index.model');
const { storeAPIKey } = require('../services/key.service');
const { sequelize } = require('../config/database');
const { initializeRedis, getClient } = require('../config/redis');
const { logger } = require('../config/logger');

/**
 * This script generates a new public API key for a client application (e.g., the frontend).
 * It stores the hashed key in the database and the original key in Redis for validation.
 * The original, unhashed key is printed to the console.
 */
const seedClientAPIKey = async () => {
    let redisClient;
    try {
        logger.info('Initializing services...');
        await initializeRedis();
        redisClient = getClient();
        logger.info('Services initialized.');

        logger.info('Starting to seed new client API key...');

        // 1. Generate a new API token
        const apiKey = createAPIToken();
        const hashedKey = hashToken(apiKey, process.env.API_KEY_HASH_SECRET);

        logger.info('New token generated.');

        // 2. Store the hashed key in the PostgreSQL database
        // We use userId: null to signify this is a system/application key.
        const newDbKey = await Key.create({
            value: hashedKey,
            userId: null,
            status: 'activated'
        });

        logger.info(`Hashed key stored in database with ID: ${newDbKey.id}`);

        // 3. Store the original key in Redis for fast validation
        const metadata = {
            keyId: newDbKey.id,
            type: 'public_client',
            description: 'API Key for the primary frontend application.'
        };
        await storeAPIKey(apiKey, metadata);

        // 4. Print the key to the console for the developer
        console.log('\\n✅ New Client API Key Seeded Successfully!\\n');
        console.log('----------------------------------------------------------------');
        console.log('Please add the following key to your frontend .env file:\\n');
        console.log(`REACT_APP_PUBLIC_API_KEY="${apiKey}"`);
        console.log('----------------------------------------------------------------\\n');

    } catch (error) {
        logger.error('Error seeding API key:', error);
        console.error('\\n❌ Failed to seed API key. Please check the error logs.\\n');
        process.exit(1);
    } finally {
        // 5. Close connections
        logger.info('Closing database and Redis connections...');
        await sequelize.close();
        if (redisClient) {
            await redisClient.quit();
        }
        logger.info('Connections closed.');
    }
};

// Run the seeder
seedClientAPIKey();
