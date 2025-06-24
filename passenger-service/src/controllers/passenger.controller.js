const passengerService = require('../services/passenger.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');

// GET /v1/passengers/getallPassengers
const getAllPassengers = asyncErrorHandler(async (req, res, next) => {
    const passengers = await passengerService.getAllPassengers();
    res.status(200).json({ 
        success: true,
        message: 'Passengers retrieved successfully', 
        data: passengers,
        count: passengers.length
    });
});

// GET /v1/passengers/getPassengerById/:id
const getPassengerById = asyncErrorHandler(async (req, res, next) => {
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
});

// PUT /v1/passengers/updatePassenger/:id
const updatePassenger = asyncErrorHandler(async (req, res, next) => {
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
});

// DELETE /v1/passengers/deletePassenger/:id
const deletePassenger = asyncErrorHandler(async (req, res, next) => {
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
});

// POST /v1/passengers/createPassenger
const createPassenger = async (req, res, next) => {
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
};

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

/**
 * Delete current passenger (soft delete)
 * @param {Object} req - Express request object 
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const deleteMe = asyncErrorHandler(async (req, res, next) => {
    // Try both userId formats for compatibility
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
});

// POST /v1/passengers/me/tickets
const addTicket = async (req, res, next) => {
    try {
        const { ticketId } = req.body;
        const userId = req.user.id;
        
        if (!ticketId) {
            return res.status(400).json({
                success: false,
                message: 'Ticket ID is required'
            });
        }
        
        const passenger = await passengerService.addTicketToPassenger(userId, ticketId);
        
        if (!passenger) {
            return res.status(404).json({ 
                success: false,
                message: 'Passenger profile not found' 
            });
        }
        
        res.json({ 
            success: true,
            message: 'Ticket added successfully',
            data: passenger 
        });
    } catch (err) {
        next(err);
    }
};

// DELETE /v1/passengers/me/tickets/:ticketId
const removeTicket = async (req, res, next) => {
    try {
        const { ticketId } = req.params;
        const userId = req.user.id;
        
        const passenger = await passengerService.removeTicketFromPassenger(userId, ticketId);
        
        if (!passenger) {
            return res.status(404).json({ 
                success: false,
                message: 'Passenger profile not found' 
            });
        }
        
        res.json({ 
            success: true,
            message: 'Ticket removed successfully',
            data: passenger 
        });
    } catch (err) {
        next(err);
    }
};

// GET /v1/passengers/me/tickets
const getMyTickets = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        const tickets = await passengerService.getPassengerTickets(userId);
        
        res.json({ 
            success: true,
            message: 'Tickets retrieved successfully',
            data: tickets,
            count: tickets.length
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { 
    getAllPassengers, 
    getPassengerById,
    updatePassenger,
    deletePassenger,
    createPassenger, 
    getMe, 
    updateMe, 
    deleteMe,
    addTicket,
    removeTicket,
    getMyTickets
}; 