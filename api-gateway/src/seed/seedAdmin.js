const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const User = require('../models/user.model');
const { logger } = require('../config/logger');

/**
 * Seed a default admin account (idempotent).
 * Creates only if no user with role 'admin' exists.
 * Credentials can be overridden via env vars:
 *   DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_USERNAME
 */
module.exports = async function seedAdmin() {
    try {
        const existing = await User.findOne({
            where: {
                roles: { [Op.contains]: ['admin'] }
            }
        });

        if (existing) {
            logger.info('Default admin already present, skipping seeding', { userId: existing.id });
            return;
        }

        const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@metro.com';
        const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
        const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123';
        const userId = process.env.DEFAULT_ADMIN_USER_ID; // optional fixed UUID to share with other services

        const hash = await bcrypt.hash(password, 10);

        const createData = {
            email,
            username,
            password: hash,
            isVerified: true,
            roles: ['admin']
        };

        if (userId) {
            createData.id = userId;
        }

        const admin = await User.create(createData);

        logger.warn('Seeded default admin account – change password immediately!', {
            email: admin.email,
            userId: admin.id
        });
    } catch (err) {
        logger.error('Failed to seed default admin account', { error: err.message, stack: err.stack });
    }
}; 