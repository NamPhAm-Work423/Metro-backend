const { Passenger } = require('../models/index.model');
const passengerEventProducer = require('../events/passenger.producer.event');
const { logger } = require('../config/logger');
const PassengerCacheService = require('../services/cache/PassengerCacheService');
const { getClient } = require('../config/redis');

// Singleton cache instance for passengers
const USER_CACHE_PREFIX = process.env.REDIS_USER_CACHE_KEY_PREFIX || 'metrohcm:';
const passengerCache = new PassengerCacheService(getClient(), logger, `${USER_CACHE_PREFIX}user-service:user:passenger:`);

// TODO: Implement full passenger service methods
// For now, creating basic placeholder methods to make the app start

async function getAllPassengers() {
    try {
        const passengers = await Passenger.findAll({
            where: { isActive: true },
            order: [['createdAt', 'DESC']]
        });
        return passengers;
    } catch (err) {
        logger.error('Error fetching all passengers', { error: err.message });
        throw err;
    }
}

async function getPassengerById(id) {
    try {
        const passenger = await Passenger.findOne({ 
            where: { passengerId: id, isActive: true } 
        });
        return passenger;
    } catch (err) {
        logger.error('Error fetching passenger by ID', { error: err.message, id });
        throw err;
    }
}

async function getPassengerByUserId(userId) {
    try {
        const passenger = await Passenger.findOne({ where: { userId } });
        return passenger;
    } catch (err) {
        logger.error('Error fetching passenger by user ID', { error: err.message, userId });
        throw err;
    }
}

async function createPassenger(passengerData) {
    try {
        const passenger = await Passenger.create(passengerData);
        logger.info('Passenger profile created successfully', { userId: passengerData.userId });
        // warm cache
        await passengerCache.setPassenger(passenger);
        return passenger;
    } catch (err) {
        logger.error('Error creating passenger profile', { error: err.message });
        throw err;
    }
}

async function updatePassenger(userId, updateData) {
    try {
        const passenger = await Passenger.findOne({ 
            where: { userId, isActive: true } 
        });
        if (!passenger) return null;
        
        await passenger.update(updateData);
        await passengerCache.setPassenger(passenger);
        return passenger;
    } catch (err) {
        logger.error('Error updating passenger profile', { error: err.message, userId });
        throw err;
    }
}

async function updatePassengerById(id, updateData) {
    try {
        const passenger = await Passenger.findOne({ 
            where: { passengerId: id, isActive: true } 
        });
        if (!passenger) return null;
        
        await passenger.update(updateData);
        await passengerCache.setPassenger(passenger);
        return passenger;
    } catch (err) {
        logger.error('Error updating passenger profile by ID', { error: err.message, id });
        throw err;
    }
}

async function deletePassengerById(id) {
    try {
        const passenger = await Passenger.findOne({ 
            where: { passengerId: id, isActive: true } 
        });
        if (!passenger) return false;
        
        await passengerEventProducer.publishPassengerDeleted(passenger);
        
        await passenger.destroy();
        
        // Clear cache after deletion
        await passengerCache.removePassenger(passenger.passengerId, passenger.userId, passenger.email);
        
        return true;
    } catch (err) {
        logger.error('Error deleting passenger profile by ID', { error: err.message, id });
        throw err;
    }
}

async function deletePassengerByUserId(userId) {
    try {
        const passenger = await Passenger.findOne({ 
            where: { userId, isActive: true } 
        });
        if (!passenger) return { success: false, message: 'Passenger not found' };
        
        // Publish event before deletion
        await passengerEventProducer.publishPassengerDeleted(passenger);
        
        await passenger.destroy();
        
        // Clear cache after deletion
        await passengerCache.removePassenger(passenger.passengerId, passenger.userId, passenger.email);
        
        return { success: true, message: 'Passenger profile deleted successfully' };
    } catch (err) {
        logger.error('Error deleting passenger profile by user ID', { error: err.message, userId });
        throw err;
    }
}

// Utility used by event handlers and controllers
async function syncPassengerCacheForUser(userId, email) {
    try {
        const passenger = await getPassengerByUserId(userId);
        if (!passenger) return false;
        const payload = {
            passengerId: passenger.passengerId,
            userId: passenger.userId,
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            phoneNumber: passenger.phoneNumber,
            email: email || passenger.email || null,
            dateOfBirth: passenger.dateOfBirth,
            gender: passenger.gender,
            updatedAt: new Date().toISOString()
        };
        await passengerCache.setPassenger(payload);
        return true;
    } catch (err) {
        logger.error('Error syncing passenger cache for user', { error: err.message, userId });
        return false;
    }
}

async function setPassengerCache(passengerData) {
    try {
        await passengerCache.setPassenger(passengerData);
        return true;
    } catch (err) {
        logger.error('Error setting passenger cache directly', { error: err.message });
        return false;
    }
}


module.exports = {
    getAllPassengers,
    getPassengerById,
    getPassengerByUserId,
    createPassenger,
    updatePassenger,
    updatePassengerById,
    deletePassengerById,
    deletePassengerByUserId,
    syncPassengerCacheForUser,
    setPassengerCache,

}; 