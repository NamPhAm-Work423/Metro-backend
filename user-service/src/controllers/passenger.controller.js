const passengerService = require('../services/passenger.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const passengerProducer = require('../events/passenger.producer.event');

// GET /v1/passengers/getallPassengers
const getAllPassengers = asyncErrorHandler(async (req, res, next) => {
    try {
        const passengers = await passengerService.getAllPassengers();
        res.status(200).json({ 
            success: true,
            message: 'Passengers retrieved successfully', 
            data: passengers,
            count: passengers.length
        });
    } catch (error) {
        next(error);
    }
});

// GET /v1/passengers/getPassengerById/:id
const getPassengerById = asyncErrorHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const passenger = await passengerService.getPassengerById(id);
        
        if (!passenger) {
            return res.status(404).json({
                success: false,
                message: 'Passenger not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Passenger retrieved successfully',
            data: passenger
        });
    } catch (error) {
        next(error);
    }
});

// PUT /v1/passengers/updatePassenger/:id
const updatePassenger = asyncErrorHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const passenger = await passengerService.updatePassengerById(id, updateData);
        
        if (!passenger) {
            return res.status(404).json({
                success: false,
                message: 'Passenger not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Passenger updated successfully',
            data: passenger
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /v1/passengers/deletePassenger/:id
const deletePassenger = asyncErrorHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const result = await passengerService.deletePassengerById(id);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Passenger not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Passenger deleted successfully'
        });
    } catch (error) {
        next(error);
        throw error;
    }
});

// POST /v1/passengers/createPassenger
const createPassenger = asyncErrorHandler(async (req, res, next) => {
    try {
        const { firstName, lastName, username, phoneNumber, dateOfBirth, gender, address, emergencyContact } = req.body;
        const userId = req.headers['x-user-id'] || req.user?.id;

        // Check if passenger already exists
        const existing = await passengerService.getPassengerByUserId(userId);
        if (existing) {
            return res.status(409).json({ 
                success: false,
                message: 'Passenger profile already exists' 
            });
        }
        
        const passengerData = {
            userId,
            username: username || `user_${userId.slice(-8)}`,
            firstName,
            lastName,
            phoneNumber: phoneNumber || null,
            dateOfBirth: dateOfBirth || null,
            gender: gender || null,
            address: address || null,
            emergencyContact: emergencyContact || null
        };
        
        const passenger = await passengerService.createPassenger(passengerData);
        
        res.status(201).json({ 
            success: true, 
            message: 'Passenger profile created successfully',
            data: passenger 
        });
    } catch (err) {
        if (err.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: err.errors.map(e => ({ field: e.path, message: e.message }))
            });
        }
        next(err);
    }
});

// GET /v1/passengers/me
const getMe = async (req, res, next) => {
    try {
        const passenger = await passengerService.getPassengerByUserId(req.user.id);
        if (!passenger) {
            return res.status(404).json({ 
                success: false,
                message: 'Passenger profile not found' 
            });
        }
        res.json({ 
            success: true, 
            data: passenger 
        });
    } catch (err) {
        next(err);
    }
};

// PUT /v1/passengers/me
const updateMe = async (req, res, next) => {
    try {
        const { firstName, lastName, phoneNumber, dateOfBirth, gender, address, emergencyContact } = req.body;
        const userId = req.user.id;
        
        const updateData = {
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth,
            gender,
            address,
            emergencyContact
        };
        
        const passenger = await passengerService.updatePassenger(userId, updateData);
        
        if (!passenger) {
            return res.status(404).json({ 
                success: false,
                message: 'Passenger profile not found' 
            });
        }
        
        res.json({ 
            success: true,
            message: 'Passenger profile updated successfully',
            data: passenger 
        });
    } catch (err) {
        if (err.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: err.errors.map(e => ({ field: e.path, message: e.message }))
            });
        }
        next(err);
    }
};

// DELETE /v1/passengers/me
const deleteMe = asyncErrorHandler(async (req, res, next) => {
    try {
        const userId = req.user.userId || req.user.id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in request'
            });
        }

        const result = await passengerService.deletePassengerByUserId(userId);

        res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

// POST /v1/passengers/sync-passenger
const syncPassenger = asyncErrorHandler(async (req, res, next) => {
    try {
        const userId = req.user.userId || req.user.id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in request'
            });
        }

        // Get passenger data from database
        const passenger = await passengerService.getPassengerByUserId(userId);
        
        if (!passenger) {
            return res.status(404).json({
                success: false,
                message: 'Passenger profile not found'
            });
        }

        // Import passenger producer
        
        // Send passenger data to ticket-service cache via Kafka
        await passengerProducer.publishPassengerCacheSync(passenger);
        
        res.status(200).json({
            success: true,
            message: 'Passenger data synchronized successfully',
            data: {
                passengerId: passenger.passengerId,
                syncedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /v1/passengers/deletePassengerById/:id

const deletePassengerById = asyncErrorHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await passengerService.deletePassengerById(id);
        res.status(200).json({
            success: true,
            message: 'Passenger deleted successfully',
            data: result
        });
    } catch (error) {
        next(error);
        throw error;
    }
});

module.exports = { 
    getAllPassengers, 
    getPassengerById,
    updatePassenger,
    deletePassenger,
    createPassenger, 
    getMe, 
    updateMe, 
    deleteMe,
    syncPassenger,
    deletePassengerById
}; 