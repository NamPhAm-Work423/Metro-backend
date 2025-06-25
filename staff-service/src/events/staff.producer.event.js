const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

class StaffEventProducer {
    /**
     * Publish user.deleted event
     * @param {Object} userData - User data to publish
     */
    async publishUserDeleted(userData) {
        try {
            const message = {
                userId: userData.userId,
                email: userData.email,
                username: userData.username,
                firstName: userData.firstName,
                lastName: userData.lastName,
                deletedAt: new Date().toISOString(),
                source: 'staff-service'
            };

            await publish(
                process.env.USER_DELETED_TOPIC || 'user.deleted',
                userData.userId,
                message
            );
            
            logger.info('User deleted event published successfully', {
                userId: userData.userId,
                email: userData.email,
                topic: process.env.USER_DELETED_TOPIC || 'user.deleted',
                service: 'staff-service',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to publish user deleted event', {
                error: error.message,
                userId: userData.userId,
                service: 'staff-service',
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Publish staff.deleted event
     * @param {Object} staffData - Staff data to publish
     */
    async publishStaffDeleted(staffData) {
        try {
            const message = {
                staffId: staffData.staffId,
                userId: staffData.userId,
                username: staffData.username,
                firstName: staffData.firstName,
                lastName: staffData.lastName,
                phoneNumber: staffData.phoneNumber,
                dateOfBirth: staffData.dateOfBirth,
                deletedAt: new Date().toISOString(),
                source: 'staff-service'
            };

            await publish(
                process.env.STAFF_DELETED_TOPIC || 'staff.deleted',
                staffData.userId,
                message
            );
            
            logger.info('Staff deleted event published successfully', {
                staffId: staffData.staffId,
                userId: staffData.userId,
                username: staffData.username,
                topic: process.env.STAFF_DELETED_TOPIC || 'staff.deleted',
                service: 'staff-service',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to publish staff deleted event', {
                error: error.message,
                staffId: staffData.staffId,
                userId: staffData.userId,
                service: 'staff-service',
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Publish staff.updated event
     * @param {Object} staffData - Updated staff data
     */
    async publishStaffUpdated(staffData) {
        try {
            const message = {
                staffId: staffData.staffId,
                userId: staffData.userId,
                username: staffData.username,
                firstName: staffData.firstName,
                lastName: staffData.lastName,
                phoneNumber: staffData.phoneNumber,
                dateOfBirth: staffData.dateOfBirth,
                isActive: staffData.isActive,
                updatedAt: new Date().toISOString(),
                source: 'staff-service'
            };

            await publish(
                process.env.STAFF_UPDATED_TOPIC || 'staff.updated',
                staffData.userId,
                message
            );
            
            logger.info('Staff updated event published successfully', {
                staffId: staffData.staffId,
                userId: staffData.userId,
                username: staffData.username,
                service: 'staff-service',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to publish staff updated event', {
                error: error.message,
                staffId: staffData.staffId,
                userId: staffData.userId,
                service: 'staff-service',
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    /**
     * Publish staff.status.changed event
     * @param {Object} staffData - Staff data with status change
     */
    async publishStaffStatusChanged(staffData) {
        try {
            const message = {
                staffId: staffData.staffId,
                userId: staffData.userId,
                username: staffData.username,
                oldStatus: staffData.oldStatus,
                newStatus: staffData.isActive,
                changedAt: new Date().toISOString(),
                source: 'staff-service'
            };

            await publish(
                process.env.STAFF_STATUS_CHANGED_TOPIC || 'staff.status.changed',
                staffData.userId,
                message
            );
            
            logger.info('Staff status changed event published successfully', {
                staffId: staffData.staffId,
                username: staffData.username,
                oldStatus: staffData.oldStatus,
                newStatus: staffData.isActive,
                service: 'staff-service',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Failed to publish staff status changed event', {
                error: error.message,
                staffId: staffData.staffId,
                userId: staffData.userId,
                service: 'staff-service',
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
}

module.exports = new StaffEventProducer(); 