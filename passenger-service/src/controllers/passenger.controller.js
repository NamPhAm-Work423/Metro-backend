const { Passenger } = require('../models/index.model');

// GET /v1/passengers
const getAllPassengers = async (req, res, next) => {
    try {
        const passengers = await Passenger.findAll({
            where: { isActive: true },
            attributes: ['passengerId', 'userId', 'username', 'firstName', 'lastName', 'phoneNumber', 'isActive', 'createdAt']
        });
        
        res.json({ 
            success: true,
            message: 'Passengers retrieved successfully',
            data: passengers,
            count: passengers.length
        });
    } catch (err) {
        next(err);
    }
};

// POST /v1/passengers
const createPassenger = async (req, res, next) => {
    try {
        const { firstName, lastName, username, phoneNumber, dateOfBirth, gender, address, emergencyContact } = req.body;
        const userId = req.headers['x-user-id'] || req.user?.id;

        // Ensure not existing
        const existing = await Passenger.findOne({ where: { userId } });
        if (existing) {
            return res.status(409).json({ 
                success: false,
                message: 'Passenger profile already exists' 
            });
        }
        
        const passenger = await Passenger.create({ 
            userId, 
            username: username || `user_${userId.slice(-8)}`, // fallback username
            firstName, 
            lastName, 
            phoneNumber: phoneNumber || null,
            dateOfBirth: dateOfBirth || null,
            gender: gender || null,
            address: address || null,
            emergencyContact: emergencyContact || null
        });
        
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
};

// GET /v1/passengers/me
const getMe = async (req, res, next) => {
    try {
        const passenger = await Passenger.findOne({ where: { userId: req.user.id } });
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
        
        const passenger = await Passenger.findOne({ where: { userId } });
        if (!passenger) {
            return res.status(404).json({ 
                success: false,
                message: 'Passenger profile not found' 
            });
        }
        
        await passenger.update({ 
            firstName, 
            lastName, 
            phoneNumber,
            dateOfBirth,
            gender,
            address,
            emergencyContact
        });
        
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
const deleteMe = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const passenger = await Passenger.findOne({ where: { userId } });
        if (!passenger) {
            return res.status(404).json({ 
                success: false,
                message: 'Passenger profile not found' 
            });
        }
        
        await passenger.update({ isActive: false });
        
        res.json({ 
            success: true,
            message: 'Passenger profile deactivated successfully'
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getAllPassengers, createPassenger, getMe, updateMe, deleteMe }; 