const { Passenger } = require('../models/index.model');
const { Op } = require('sequelize');
const passengerEventProducer = require('../events/passenger.producer.event');
const { logger } = require('../config/logger');

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
        return passenger;
    } catch (err) {
        logger.error('Error creating passenger profile', { error: err.message });
        throw err;
    }
}

async function updatePassenger(userId, updateData) {
    try {
        const passenger = await Passenger.findOne({ where: { userId } });
        if (!passenger) return null;
        
        await passenger.update(updateData);
        
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
        
        return true;
    } catch (err) {
        logger.error('Error deleting passenger profile by ID', { error: err.message, id });
        throw err;
    }
}

async function deletePassengerByUserId(userId) {
    try {
        const passenger = await Passenger.findOne({ where: { userId } });
        if (!passenger) return { success: false, message: 'Passenger not found' };
        
        // Publish event trước khi xóa
        await passengerEventProducer.publishPassengerDeleted(passenger);
        
        await passenger.destroy();
        
        return { success: true, message: 'Passenger profile deleted successfully' };
    } catch (err) {
        logger.error('Error deleting passenger profile by user ID', { error: err.message, userId });
        throw err;
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

}; 