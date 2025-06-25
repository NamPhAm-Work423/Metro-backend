const { Staff } = require('../models/index.model');
const { Op } = require('sequelize');
const staffEventProducer = require('../events/staff.producer.event');
const { logger } = require('../config/logger');

/**
 * Create a staff profile
 * @param {Object} staffData - Staff data
 * @returns {Object} - Created staff profile
 */
async function createStaff(staffData) {
    try {
        const staff = await Staff.create({
            ...staffData,
            isActive: true
        });

        logger.info('Staff profile created successfully', { 
            userId: staffData.userId,
            staffId: staff.staffId 
        });

        return staff;

    } catch (err) {
        logger.error('Error creating staff profile', { 
            error: err.message, 
            stack: err.stack,
            staffData: JSON.stringify(staffData)
        });
        throw err;
    }
}

/**
 * Get staff profile by user ID
 * @param {string} userId - User ID
 * @returns {Object|null} - Staff profile or null if not found
 */
async function getStaffByUserId(userId) {
    try {
        const staff = await Staff.findOne({ where: { userId } });
        return staff;
    } catch (err) {
        logger.error('Error fetching staff by user ID', { 
            error: err.message, 
            userId 
        });
        throw err;
    }
}

/**
 * Get staff profile by staff ID
 * @param {string} id - Staff ID
 * @returns {Object|null} - Staff profile or null if not found
 */
async function getStaffById(id) {
    try {
        const staff = await Staff.findOne({ 
            where: { 
                staffId: id, 
                isActive: true 
            } 
        });
        return staff;
    } catch (err) {
        logger.error('Error fetching staff by ID', { 
            error: err.message, 
            id 
        });
        throw err;
    }
}

/**
 * Update staff profile
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object|null} - Updated staff profile or null if not found
 */
async function updateStaff(userId, updateData) {
    try {
        const staff = await Staff.findOne({ where: { userId } });
        if (!staff) {
            logger.error('Staff profile not found', { userId });
            return null;
        }

        const oldData = { ...staff.dataValues };
        await staff.update(updateData);
        
        // Publish staff updated event
        await staffEventProducer.publishStaffUpdated(staff);
        
        logger.info('Staff profile updated successfully', { 
            userId, 
            staffId: staff.staffId,
            updatedFields: Object.keys(updateData)
        });

        return staff;

    } catch (err) {
        logger.error('Error updating staff profile', { 
            error: err.message, 
            userId,
            updateData
        });
        throw err;
    }
}

/**
 * Update staff profile by staff ID
 * @param {string} id - Staff ID
 * @param {Object} updateData - Data to update
 * @returns {Object|null} - Updated staff profile or null if not found
 */
async function updateStaffById(id, updateData) {
    try {
        const staff = await Staff.findOne({ 
            where: { 
                staffId: id, 
                isActive: true 
            } 
        });
        
        if (!staff) {
            logger.error('Staff profile not found', { id });
            return null;
        }

        await staff.update(updateData);
        
        // Publish staff updated event
        await staffEventProducer.publishStaffUpdated(staff);
        
        logger.info('Staff profile updated successfully', { 
            staffId: id,
            updatedFields: Object.keys(updateData)
        });

        return staff;

    } catch (err) {
        logger.error('Error updating staff profile by ID', { 
            error: err.message, 
            id,
            updateData
        });
        throw err;
    }
}

/**
 * Update staff status (active/inactive)
 * @param {string} id - Staff ID
 * @param {boolean} isActive - New status
 * @returns {Object|null} - Updated staff profile or null if not found
 */
async function updateStaffStatus(id, isActive) {
    try {
        const staff = await Staff.findOne({ 
            where: { 
                staffId: id 
            } 
        });
        
        if (!staff) {
            logger.error('Staff profile not found', { id });
            return null;
        }

        const oldStatus = staff.isActive;
        await staff.update({ isActive });
        
        // Publish staff status changed event
        await staffEventProducer.publishStaffStatusChanged({
            ...staff.dataValues,
            oldStatus
        });
        
        logger.info('Staff status updated successfully', { 
            staffId: id,
            oldStatus,
            newStatus: isActive
        });

        return staff;

    } catch (err) {
        logger.error('Error updating staff status', { 
            error: err.message, 
            id,
            isActive
        });
        throw err;
    }
}

/**
 * Deactivate staff profile
 * @param {string} userId - User ID
 * @returns {Object|null} - Updated staff profile or null if not found
 */
async function deactivateStaff(userId) {
    try {
        const staff = await Staff.findOne({ where: { userId } });
        if (!staff) {
            logger.error('Staff profile not found', { userId });
            return null;
        }

        const oldStatus = staff.isActive;
        await staff.update({ isActive: false });
        
        // Publish staff status changed event
        await staffEventProducer.publishStaffStatusChanged({
            ...staff.dataValues,
            oldStatus
        });
        
        logger.info('Staff profile deactivated successfully', { 
            userId, 
            staffId: staff.staffId 
        });

        return staff;

    } catch (err) {
        logger.error('Error deactivating staff profile', { 
            error: err.message, 
            userId 
        });
        throw err;
    }
}

/**
 * Delete staff account and related data
 * @param {string} userId - User ID
 * @returns {Object} Deletion result
 */
async function deleteStaffByUserId(userId) {
    const transaction = await Staff.sequelize.transaction();
    
    try {
        // Find the staff data first for the event
        const staff = await Staff.findOne({
            where: { userId },
            transaction
        });

        if (!staff) {
            throw new Error('Staff not found');
        }

        // Publish staff deleted event before deletion
        await staffEventProducer.publishStaffDeleted(staff);
        
        // Soft delete - set isActive to false
        await staff.update({ isActive: false }, { transaction });
        
        await transaction.commit();
        
        logger.info('Staff deleted successfully', { 
            userId,
            staffId: staff.staffId
        });

        return { success: true, message: 'Staff deleted successfully' };

    } catch (err) {
        await transaction.rollback();
        logger.error('Error deleting staff', { 
            error: err.message, 
            userId 
        });
        throw err;
    }
}

/**
 * Delete staff account by staff ID
 * @param {string} staffId - Staff ID
 * @returns {Object} Deletion result
 */
async function deleteStaffById(staffId) {
    const transaction = await Staff.sequelize.transaction();
    
    try {
        // Find the staff data first for the event
        const staff = await Staff.findOne({
            where: { staffId },
            transaction
        });

        if (!staff) {
            throw new Error('Staff not found');
        }

        // Publish staff deleted event before deletion
        await staffEventProducer.publishStaffDeleted(staff);
        
        // Soft delete - set isActive to false
        await staff.update({ isActive: false }, { transaction });
        
        await transaction.commit();
        
        logger.info('Staff deleted successfully', { 
            staffId,
            userId: staff.userId
        });

        return { success: true, message: 'Staff deleted successfully' };

    } catch (err) {
        await transaction.rollback();
        logger.error('Error deleting staff by ID', { 
            error: err.message, 
            staffId 
        });
        throw err;
    }
}

/**
 * Get all staff profiles
 * @param {Object} options - Query options
 * @returns {Array} - Array of staff profiles
 */
async function getAllStaff(options = {}) {
    try {
        const { isActive = true, limit, offset } = options;
        
        const queryOptions = {
            where: { isActive },
            order: [['createdAt', 'DESC']]
        };
        
        if (limit) queryOptions.limit = limit;
        if (offset) queryOptions.offset = offset;
        
        const staff = await Staff.findAll(queryOptions);
        return staff;
    } catch (err) {
        logger.error('Error fetching all staff', { error: err.message });
        throw err;
    }
}

module.exports = {
    createStaff,
    getStaffByUserId,
    getStaffById,
    updateStaff,
    updateStaffById,
    updateStaffStatus,
    deactivateStaff,
    deleteStaffByUserId,
    deleteStaffById,
    getAllStaff
};
