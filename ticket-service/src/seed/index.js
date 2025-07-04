const sequelize = require('../config/database');
const seedFares = require('./fare');
const { logger } = require('../config/logger');

async function runSeeds() {
    try {
        logger.info('🔄 Checking database connection...');
        await sequelize.authenticate();
        logger.info('✅ Database connection ready');

        // Run individual seeders
        await seedFares();

        logger.info('🎉 All seeds executed successfully');
    } catch (error) {
        logger.error('❌ Seeding failed:', error);
        throw error;
    }
}

module.exports = { runSeeds };
