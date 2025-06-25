const { Passenger } = require('../models/index.model');
const { Op } = require('sequelize');
const passengerEventProducer = require('../events/passenger.producer.event');
const { logger } = require('../config/logger');



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
 * Delete passenger account and related data
 * @param {string} userId - User ID
 * @returns {Object} Deletion result
 */
async function deletePassengerByUserId(userId) {
    const transaction = await Passenger.sequelize.transaction();
    
    try {
        // Find the passenger data first for the event
        const passenger = await Passenger.findOne({
            where: { userId },
            transaction
        });

        if (!passenger) {
            throw new Error('Passenger not found');
        }

        // Prepare event data before deletion
        const eventData = {
            passengerId: passenger.passengerId,
            userId: passenger.userId,
            email: passenger.email,
            username: passenger.username || passenger.email,
            firstName: passenger.firstName,
            lastName: passenger.lastName
        };

        // Delete the passenger record (this will cascade to related data)
        await Passenger.destroy({
            where: { userId },
            transaction
        });


        await transaction.commit();

        // Publish deletion events after successful deletion
        try {
            await passengerEventProducer.publishUserDeleted(eventData);
        } catch (eventError) {
            // Log event publishing error but don't rollback deletion
            logger.error('Failed to publish deletion events', {
                error: eventError.message,
                userId,
                service: 'passenger-service'
            });
        }

        logger.info('Passenger deleted successfully', {
            userId,
            passengerId: eventData.passengerId,
            service: 'passenger-service'
        });

        return {
            success: true,
            message: 'Passenger account deleted successfully',
            deletedAt: new Date().toISOString()
        };

    } catch (error) {
        await transaction.rollback();
        logger.error('Error deleting passenger', {
            error: error.message,
            userId,
            service: 'passenger-service'
        });
        throw error;
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

/**
 * Add a ticket to passenger's ticket list
 * @param {string} userId - User ID
 * @param {string} ticketId - Ticket UUID to add
 * @returns {Object|null} - Updated passenger profile or null if not found
 */
async function addTicketToPassenger(userId, ticketId) {
    try {
        const passenger = await Passenger.findOne({ where: { userId } });
        if (!passenger) {
            logger.error('Passenger profile not found', { userId });
            return null;
        }

        // Add ticket ID to the list if it doesn't already exist
        const currentTickets = passenger.ticketList || [];
        if (!currentTickets.includes(ticketId)) {
            const updatedTickets = [...currentTickets, ticketId];
            await passenger.update({ ticketList: updatedTickets });
            
            logger.info('Ticket added to passenger profile', { 
                userId, 
                ticketId,
                totalTickets: updatedTickets.length
            });
        }

        return passenger;

    } catch (err) {
        logger.error('Error adding ticket to passenger', { 
            error: err.message, 
            userId,
            ticketId
        });
        throw err;
    }
}

/**
 * Remove a ticket from passenger's ticket list
 * @param {string} userId - User ID
 * @param {string} ticketId - Ticket UUID to remove
 * @returns {Object|null} - Updated passenger profile or null if not found
 */
async function removeTicketFromPassenger(userId, ticketId) {
    try {
        const passenger = await Passenger.findOne({ where: { userId } });
        if (!passenger) {
            logger.error('Passenger profile not found', { userId });
            return null;
        }

        // Remove ticket ID from the list
        const currentTickets = passenger.ticketList || [];
        const updatedTickets = currentTickets.filter(id => id !== ticketId);
        
        await passenger.update({ ticketList: updatedTickets });
        
        logger.info('Ticket removed from passenger profile', { 
            userId, 
            ticketId,
            totalTickets: updatedTickets.length
        });

        return passenger;

    } catch (err) {
        logger.error('Error removing ticket from passenger', { 
            error: err.message, 
            userId,
            ticketId
        });
        throw err;
    }
}

/**
 * Get passenger's tickets
 * @param {string} userId - User ID
 * @returns {Array} - Array of ticket UUIDs
 */
async function getPassengerTickets(userId) {
    try {
        const passenger = await Passenger.findOne({ where: { userId } });
        if (!passenger) {
            logger.error('Passenger profile not found', { userId });
            return [];
        }

        return passenger.ticketList || [];

    } catch (err) {
        logger.error('Error getting passenger tickets', { 
            error: err.message, 
            userId
        });
        throw err;
    }
}

module.exports = {
    createPassenger,
    getPassengerByUserId,
    getPassengerById,
    updatePassenger,
    updatePassengerById,
    deactivatePassenger,
    deletePassengerByUserId,
    getAllPassengers,
    addTicketToPassenger,
    removeTicketFromPassenger,
    getPassengerTickets
}; 