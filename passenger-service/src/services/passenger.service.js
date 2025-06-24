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
            address,
            roles
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
 * Create a passenger profile
 * @param {Object} passengerData - Passenger data
 * @returns {Object} - Created passenger profile
 */
async function createPassenger(passengerData) {
    try {
        const passenger = await Passenger.create({
            ...passengerData,
            isActive: true
        });

        logger.info('Passenger profile created successfully', { 
            userId: passengerData.userId,
            passengerId: passenger.id 
        });

        return passenger;

    } catch (err) {
        logger.error('Error creating passenger profile', { 
            error: err.message, 
            stack: err.stack,
            passengerData: JSON.stringify(passengerData)
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
 * Get passenger profile by passenger ID
 * @param {string} id - Passenger ID
 * @returns {Object|null} - Passenger profile or null if not found
 */
async function getPassengerById(id) {
    try {
        const passenger = await Passenger.findOne({ 
            where: { 
                id, 
                isActive: true 
            } 
        });
        return passenger;
    } catch (err) {
        logger.error('Error fetching passenger by ID', { 
            error: err.message, 
            id 
        });
        throw err;
    }
}

/**
 * Update passenger profile
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object|null} - Updated passenger profile or null if not found
 */
async function updatePassenger(userId, updateData) {
    try {
        const passenger = await Passenger.findOne({ where: { userId } });
        if (!passenger) {
            logger.error('Passenger profile not found', { userId });
            return null;
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
 * Update passenger profile by passenger ID
 * @param {string} id - Passenger ID
 * @param {Object} updateData - Data to update
 * @returns {Object|null} - Updated passenger profile or null if not found
 */
async function updatePassengerById(id, updateData) {
    try {
        const passenger = await Passenger.findOne({ 
            where: { 
                id, 
                isActive: true 
            } 
        });
        
        if (!passenger) {
            logger.error('Passenger profile not found', { id });
            return null;
        }

        await passenger.update(updateData);
        
        logger.info('Passenger profile updated successfully', { 
            passengerId: id,
            updatedFields: Object.keys(updateData)
        });

        return passenger;

    } catch (err) {
        logger.error('Error updating passenger profile by ID', { 
            error: err.message, 
            id,
            updateData
        });
        throw err;
    }
}

/**
 * Deactivate passenger profile
 * @param {string} userId - User ID
 * @returns {Object|null} - Updated passenger profile or null if not found
 */
async function deactivatePassenger(userId) {
    try {
        const passenger = await Passenger.findOne({ where: { userId } });
        if (!passenger) {
            logger.error('Passenger profile not found', { userId });
            return null;
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
 * Delete passenger profile by passenger ID
 * @param {string} id - Passenger ID
 * @returns {Object|null} - Deleted passenger profile or null if not found
 */
async function deletePassengerById(id) {
    try {
        const passenger = await Passenger.findOne({ 
            where: { 
                id, 
                isActive: true 
            } 
        });
        
        if (!passenger) {
            logger.error('Passenger profile not found', { id });
            return null;
        }

        await passenger.update({ isActive: false });
        
        logger.info('Passenger profile deleted successfully', { 
            passengerId: id 
        });

        return passenger;

    } catch (err) {
        logger.error('Error deleting passenger profile by ID', { 
            error: err.message, 
            id 
        });
        throw err;
    }
}

/**
 * Get all active passengers (for admin purposes)
 * @param {Object} options - Query options (limit, offset, etc.)
 * @returns {Array} - Passengers list
 */
async function getAllPassengers(options = {}) {
    try {
        const passengers = await Passenger.findAll({
            where: { isActive: true },
            attributes: ['id', 'userId', 'username', 'firstName', 'lastName', 'phoneNumber', 'isActive', 'createdAt']
        });
        return passengers;
    } catch (err) {
        logger.error('Error fetching all passengers', { error: err.message });
        throw err;
    }
}

module.exports = {
    createPassengerFromUserEvent,
    createPassenger,
    getPassengerByUserId,
    getPassengerById,
    updatePassenger,
    updatePassengerById,
    deactivatePassenger,
    deletePassengerById,
    getAllPassengers
}; 