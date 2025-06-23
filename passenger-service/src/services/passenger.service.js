const { Passenger } = require('../models/index.model');
const { logger } = require('../config/logger');

/**
 * Create a passenger profile from user registration event
 * @param {Object} userData - User data from the event
 */
async function createPassengerFromUserEvent(userData) {
    try {
        const {
            userId,
            username,
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth,
            gender,
            address
        } = userData;

        // Check if passenger profile already exists
        const exists = await Passenger.findOne({ where: { userId } });
        if (exists) {
            logger.info('Passenger profile already exists', { userId });
            return exists;
        }

        // Create passenger profile
        const passenger = await Passenger.create({
            userId,
            username,
            firstName,
            lastName,
            phoneNumber: phoneNumber || null,
            dateOfBirth: dateOfBirth || null,
            gender: gender || null,
            address: address || null,
            isActive: true
        });

        logger.info('Passenger profile created successfully', { 
            userId, 
            username, 
            passengerId: passenger.id 
        });

        return passenger;

    } catch (err) {
        logger.error('Error creating passenger profile from user event', { 
            error: err.message, 
            stack: err.stack,
            userData: JSON.stringify(userData)
        });
        throw err;
    }
}

/**
 * Get passenger profile by user ID
 * @param {string} userId - User ID
 * @returns {Object|null} - Passenger profile or null if not found
 */
async function getPassengerByUserId(userId) {
    try {
        const passenger = await Passenger.findOne({ where: { userId } });
        return passenger;
    } catch (err) {
        logger.error('Error fetching passenger by user ID', { 
            error: err.message, 
            userId 
        });
        throw err;
    }
}

/**
 * Update passenger profile
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object} - Updated passenger profile
 */
async function updatePassenger(userId, updateData) {
    try {
        const passenger = await Passenger.findOne({ where: { userId } });
        if (!passenger) {
            throw new Error('Passenger profile not found');
        }

        await passenger.update(updateData);
        
        logger.info('Passenger profile updated successfully', { 
            userId, 
            passengerId: passenger.id,
            updatedFields: Object.keys(updateData)
        });

        return passenger;

    } catch (err) {
        logger.error('Error updating passenger profile', { 
            error: err.message, 
            userId,
            updateData
        });
        throw err;
    }
}

/**
 * Deactivate passenger profile
 * @param {string} userId - User ID
 * @returns {Object} - Updated passenger profile
 */
async function deactivatePassenger(userId) {
    try {
        const passenger = await Passenger.findOne({ where: { userId } });
        if (!passenger) {
            throw new Error('Passenger profile not found');
        }

        await passenger.update({ isActive: false });
        
        logger.info('Passenger profile deactivated successfully', { 
            userId, 
            passengerId: passenger.id 
        });

        return passenger;

    } catch (err) {
        logger.error('Error deactivating passenger profile', { 
            error: err.message, 
            userId 
        });
        throw err;
    }
}

/**
 * Get all active passengers (for admin purposes)
 * @param {Object} options - Query options (limit, offset, etc.)
 * @returns {Object} - Passengers list with pagination info
 */
async function getAllPassengers(options = {}) {
    try {
        const { 
            limit = 10, 
            offset = 0, 
            isActive = true 
        } = options;

        const { count, rows } = await Passenger.findAndCountAll({
            where: { isActive },
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        return {
            passengers: rows,
            total: count,
            limit,
            offset
        };

    } catch (err) {
        logger.error('Error fetching all passengers', { 
            error: err.message,
            options
        });
        throw err;
    }
}

module.exports = {
    createPassengerFromUserEvent,
    getPassengerByUserId,
    updatePassenger,
    deactivatePassenger,
    getAllPassengers
}; 