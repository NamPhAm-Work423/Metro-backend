const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

class AdminEventProducer {
    /**
     * Publish admin.deleted event
     * @param {Object} adminData - Admin data to publish
     */
    async publishAdminDeleted(adminData) {
        try {
            const message = {
                adminId: adminData.adminId,
                userId: adminData.userId,
                deletedAt: new Date().toISOString(),
                source: 'user-service'
            };

            await publish(
                process.env.ADMIN_DELETED_TOPIC || 'admin.deleted',
                adminData.userId,
                message
            );
            
            logger.info('Admin deleted event published successfully', {
                adminId: adminData.adminId,
                userId: adminData.userId,
                topic: process.env.ADMIN_DELETED_TOPIC || 'admin.deleted',
                service: 'user-service',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to publish admin deleted event', {
                error: error.message,
                adminId: adminData.adminId,
                userId: adminData.userId,
                service: 'user-service',
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Publish admin.updated event
     * @param {Object} adminData - Updated admin data
     */
    async publishAdminUpdated(adminData) {
        try {
            const message = {
                adminId: adminData.adminId,
                userId: adminData.userId,
                updatedAt: new Date().toISOString(),
                source: 'user-service'
            };

            await publish(
                process.env.ADMIN_UPDATED_TOPIC || 'admin.updated',
                adminData.userId,
                message
            );
            
            logger.info('Admin updated event published successfully', {
                adminId: adminData.adminId,
                userId: adminData.userId,
                service: 'user-service',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to publish admin updated event', {
                error: error.message,
                adminId: adminData.adminId,
                userId: adminData.userId,
                service: 'user-service',
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
}

module.exports = new AdminEventProducer(); 