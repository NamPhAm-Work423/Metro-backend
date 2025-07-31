const { Staff } = require('../models/index.model');
const { Op } = require('sequelize');
const staffEventProducer = require('../events/staff.producer.event');
const { logger } = require('../config/logger');

// TODO: Implement full staff service methods
// For now, creating basic placeholder methods to make the app start

async function getAllStaff() {
    try {
        const staff = await Staff.findAll({
            order: [['createdAt', 'DESC']]
        });
        return staff;
    } catch (err) {
        logger.error('Error fetching all staff', { error: err.message });
        throw err;
    }
}

async function getStaffById(id) {
    try {
        const staff = await Staff.findOne({ 
            where: { staffId: id, isActive: true } 
        });
        return staff;
    } catch (err) {
        logger.error('Error fetching staff by ID', { error: err.message, id });
        throw err;
    }
}

async function getStaffByUserId(userId) {
    try {
        const staff = await Staff.findOne({ where: { userId } });
        return staff;
    } catch (err) {
        logger.error('Error fetching staff by user ID', { error: err.message, userId });
        throw err;
    }
}

async function createStaff(staffData) {
    try {
        const staff = await Staff.create(staffData);
        logger.info('Staff profile created successfully', { userId: staffData.userId });
        return staff;
    } catch (err) {
        logger.error('Error creating staff profile', { error: err.message });
        throw err;
    }
}

async function updateStaff(userId, updateData) {
    try {
        const staff = await Staff.findOne({ where: { userId } });
        if (!staff) return null;
        
        await staff.update(updateData);
        
        return staff;
    } catch (err) {
        logger.error('Error updating staff profile', { error: err.message, userId });
        throw err;
    }
}

async function updateStaffById(id, updateData) {
    try {
        const staff = await Staff.findOne({ 
            where: { staffId: id, isActive: true } 
        });
        if (!staff) return null;
        
        await staff.update(updateData);
        
        return staff;
    } catch (err) {
        logger.error('Error updating staff profile by ID', { error: err.message, id });
        throw err;
    }
}

async function updateStaffStatus(id, isActive) {
    try {
        const staff = await Staff.findOne({ where: { staffId: id } });
        if (!staff) return null;
        
        await staff.update({ isActive });
        
        return staff;
    } catch (err) {
        logger.error('Error updating staff status', { error: err.message, id, isActive });
        throw err;
    }
}

async function deleteStaffById(id) {
    try {
        const staff = await Staff.findOne({ 
            where: { staffId: id, isActive: true } 
        });
        if (!staff) return false;
        
        await staffEventProducer.publishStaffDeleted(staff);
        await staff.destroy();
        
        return true;
    } catch (err) {
        logger.error('Error deleting staff profile by ID', { error: err.message, id });
        throw err;
    }
}

async function deleteStaffByUserId(userId) {
    try {
        const staff = await Staff.findOne({ where: { userId } });
        if (!staff) return false;
        
        await staffEventProducer.publishStaffDeleted(staff);
        await staff.destroy();
        
        return true;
    } catch (err) {
        logger.error('Error deleting staff profile by user ID', { error: err.message, userId });
        throw err;
    }
}

module.exports = {
    getAllStaff,
    getStaffById,
    getStaffByUserId,
    createStaff,
    updateStaff,
    updateStaffById,
    updateStaffStatus,
    deleteStaffById,
    deleteStaffByUserId
}; 