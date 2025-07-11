const sequelize = require('../config/database');
const seedFares = require('./fare');
const { logger } = require('../config/logger');
const TransportClient = require('../grpc/transportClient');

async function createFallbackFares() {
    const { v4: uuidv4 } = require('uuid');
    const { Fare } = require('../models/index.model');
    
    try {
        // Check if we already have fares
        const existingFares = await Fare.count();
        if (existingFares > 0) {
            logger.info('✅ Fares already exist, skipping fallback creation');
            return;
        }

        // Create basic fallback fares for common route types
        const fallbackFares = [
            {
                fareId: uuidv4(),
                routeId: '00000000-0000-0000-0000-000000000001', // Short route
                basePrice: 10000,
                currency: 'VND',
                isActive: true
            },
            {
                fareId: uuidv4(),
                routeId: '00000000-0000-0000-0000-000000000002', // Medium route
                basePrice: 12000,
                currency: 'VND',
                isActive: true
            },
            {
                fareId: uuidv4(),
                routeId: '00000000-0000-0000-0000-000000000003', // Long route
                basePrice: 15000,
                currency: 'VND',
                isActive: true
            },
            {
                fareId: uuidv4(),
                routeId: '00000000-0000-0000-0000-000000000004', // Default fallback
                basePrice: 12000,
                currency: 'VND',
                isActive: true
            }
        ];

        await Fare.bulkCreate(fallbackFares);
        logger.info('✅ Created fallback fares successfully', { 
            count: fallbackFares.length,
            note: 'These are temporary fares. Run proper seeding when transport service becomes available.'
        });
    } catch (error) {
        logger.error('❌ Failed to create fallback fares:', error);
    }
}

async function runSeeds() {
    try {
        logger.info('🔄 Checking database connection...');
        await sequelize.authenticate();
        logger.info('✅ Database connection ready');

        // Check if transport service is available before seeding
        logger.info('🔄 Checking transport service availability...');
        const isTransportReady = await TransportClient.isTransportServiceReady();
        
        if (!isTransportReady) {
            logger.warn('⚠️ Transport service is not available. Creating fallback fares...');
            await createFallbackFares();
            logger.info('💡 The ticket service will start with fallback fare data.');
            logger.info('🔄 Run proper fare seeding when transport service becomes available.');
            return;
        }

        logger.info('✅ Transport service is ready');

        // Run individual seeders
        await seedFares();

        logger.info('🎉 All seeds executed successfully');
    } catch (error) {
        logger.error('❌ Seeding failed:', error);
        // Try to create fallback fares as last resort
        logger.warn('⚠️ Attempting to create fallback fares as backup...');
        await createFallbackFares();
        logger.warn('⚠️ Continuing startup with fallback data...');
    }
}

module.exports = { runSeeds };
