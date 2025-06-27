const { Admin } = require('../models/index.model');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../config/logger');

/**
 * Seed an initial Admin profile in user-service.
 * Requires environment var DEFAULT_ADMIN_USER_ID (UUID) that links to user in API Gateway.
 * If var missing or profile already exists, seeding is skipped.
 */
module.exports = async function seedAdminProfile() {
    const userId = process.env.DEFAULT_ADMIN_USER_ID;
    if (!userId) {
        logger.info('DEFAULT_ADMIN_USER_ID not provided, skipping admin profile seeding');
        return;
    }

    try {
        const exists = await Admin.findOne({ where: { userId } });
        if (exists) {
            logger.info('Admin profile already exists in user-service, skipping', { adminId: exists.adminId });
            return;
        }

        const admin = await Admin.create({
            adminId: uuidv4(),
            userId
        });

        logger.warn('Seeded Admin profile in user-service – make sure userId is correct', {
            adminId: admin.adminId,
            userId: admin.userId
        });
    } catch (err) {
        logger.error('Failed to seed Admin profile in user-service', { error: err.message, stack: err.stack });
    }
}; 