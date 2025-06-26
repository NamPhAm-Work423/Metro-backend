const { Admin } = require('../models/index.model');
const { Op } = require('sequelize');
const adminEventProducer = require('../events/admin.producer.event');
const { logger } = require('../config/logger');

/**
 * Get all admins
 * @returns {Array} - List of admin profiles
 */
async function getAllAdmins() {
    try {
        const admins = await Admin.findAll({
            order: [['createdAt', 'DESC']]
        });
        return admins;
    } catch (err) {
        logger.error('Error fetching all admins', { error: err.message });
        throw err;
    }
}

/**
 * Get admin profile by admin ID
 * @param {string} id - Admin ID
 * @returns {Object|null} - Admin profile or null if not found
 */
async function getAdminById(id) {
    try {
        const admin = await Admin.findByPk(id);
        return admin;
    } catch (err) {
        logger.error('Error fetching admin by ID', { error: err.message, id });
        throw err;
    }
}

/**
 * Get admin profile by user ID
 * @param {string} userId - User ID
 * @returns {Object|null} - Admin profile or null if not found
 */
async function getAdminByUserId(userId) {
    try {
        const admin = await Admin.findOne({ where: { userId } });
        return admin;
    } catch (err) {
        logger.error('Error fetching admin by user ID', { error: err.message, userId });
        throw err;
    }
}

/**
 * Update admin profile by admin ID
 * @param {string} id - Admin ID
 * @param {Object} updateData - Data to update
 * @returns {Object|null} - Updated admin profile or null if not found
 */
async function updateAdminById(id, updateData) {
    try {
        const admin = await Admin.findByPk(id);
        if (!admin) {
            logger.error('Admin profile not found', { id });
            return null;
        }

        await admin.update(updateData);
        
        // Publish update event
        await adminEventProducer.publishAdminUpdated(admin);
        
        logger.info('Admin profile updated successfully', { 
            adminId: id,
            updatedFields: Object.keys(updateData)
        });

        return admin;
    } catch (err) {
        logger.error('Error updating admin profile by ID', { 
            error: err.message, 
            id,
            updateData
        });
        throw err;
    }
}


module.exports = {
    getAllAdmins,
    getAdminById,
    getAdminByUserId,
    updateAdminById
}; 