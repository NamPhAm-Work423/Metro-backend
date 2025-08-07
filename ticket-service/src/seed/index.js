const sequelize = require('../config/database');
const seedFares = require('./fare');
const seedPassengerDiscounts = require('./passengerDiscount');
const { logger } = require('../config/logger');
const TransportClient = require('../grpc/transportClient');

async function runSeeds() {
    try {
        logger.info('Checking database connection...');
        await sequelize.authenticate();
        logger.info('Database connection ready');

        // Check if transport service is available before seeding
        logger.info('🔄 Checking transport service availability...');
        const isTransportReady = await TransportClient.isTransportServiceReady();
        
        if (!isTransportReady) {
            logger.warn('Transport service is not available. Skipping fare seeding for now.');
            logger.info('The ticket service will start without initial fare data.');
            logger.info('Fare data will be created when transport service becomes available.');
            return;
        }

        logger.info('✅ Transport service is ready');

        // Run individual seeders
        await seedFares();
        await seedPassengerDiscounts();

        logger.info('All seeds executed successfully');
    } catch (error) {
        logger.error('Seeding failed:', error);
        // Don't throw the error - let the service start without seeding
        logger.warn('Continuing startup without initial seed data...');
    }
}

module.exports = { runSeeds };
