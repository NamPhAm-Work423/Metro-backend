const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

class StaffEventProducer {
    /**
     * Publish staff.deleted event
     * @param {Object} staffData - Staff data to publish
     */
    async publishStaffDeleted(staffData) {
        try {
            const eventData = {
                eventType: 'staff.deleted',
                timestamp: new Date().toISOString(),
                data: {
                    staffId: staffData.staffId,
                    userId: staffData.userId,
                    email: staffData.email,
                    employeeId: staffData.employeeId,
                    department: staffData.department,
                    position: staffData.position,
                    deletedAt: new Date().toISOString()
                }
            };

            await publish('staff.deleted', staffData.staffId, eventData);
            logger.info('Published staff.deleted event', { 
                staffId: staffData.staffId,
                userId: staffData.userId,
                employeeId: staffData.employeeId
            });
        } catch (error) {
            logger.error('Failed to publish staff.deleted event', { 
                error: error.message,
                staffId: staffData.staffId,
                employeeId: staffData.employeeId
            });
            throw error;
        }
    }
}

module.exports = new StaffEventProducer(); 