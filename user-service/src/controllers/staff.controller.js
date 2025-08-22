const staffService = require('../services/staff.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');

// GET /v1/staff/getAllStaff
const getAllStaff = asyncErrorHandler(async (req, res, next) => {
    try {
        const staff = await staffService.getAllStaff();
        res.status(200).json({ 
            success: true,
            message: 'Staff retrieved successfully', 
            data: staff,
            count: staff.length
        });
    } catch (error) {
        next(error);
    }
});

// GET /v1/staff/getStaffById/:id
const getStaffById = asyncErrorHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const staff = await staffService.getStaffById(id);
        
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Staff not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Staff retrieved successfully',
            data: staff
        });
    } catch (error) {
        next(error);
    }
});

// PUT /v1/staff/updateStaff/:id
const updateStaff = asyncErrorHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const staff = await staffService.updateStaffById(id, updateData);
        
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Staff not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Staff updated successfully',
            data: staff
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /v1/staff/deleteStaff/:id
const deleteStaff = asyncErrorHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const result = await staffService.deleteStaffById(id);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Staff not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Staff deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

// POST /v1/staff/createStaff
const createStaff = async (req, res, next) => {
    try {
        const { firstName, lastName, username, phoneNumber, dateOfBirth } = req.body;
        const userId = req.headers['x-user-id'] || req.user?.id;

        // Check if staff already exists
        const existing = await staffService.getStaffByUserId(userId);
        if (existing) {
            return res.status(409).json({ 
                success: false,
                message: 'Staff profile already exists' 
            });
        }
        
        const staffData = {
            userId,
            username: username || `staff_${userId.slice(-8)}`,
            firstName,
            lastName,
            phoneNumber: phoneNumber || null,
            dateOfBirth: dateOfBirth || null
        };
        
        const staff = await staffService.createStaff(staffData);
        
        res.status(201).json({ 
            success: true, 
            message: 'Staff profile created successfully',
            data: staff 
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

// GET /v1/staff/me
const getMe = async (req, res, next) => {
    try {
        const staff = await staffService.getStaffByUserId(req.user.id);
        if (!staff) {
            return res.status(404).json({ 
                success: false,
                message: 'Staff profile not found' 
            });
        }
        res.json({ 
            success: true, 
            data: staff 
        });
    } catch (err) {
        next(err);
    }
};

// PUT /v1/staff/me
const updateMe = async (req, res, next) => {
    try {
        const { firstName, lastName, phoneNumber, dateOfBirth } = req.body;
        const userId = req.user.id;
        
        const updateData = {
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth
        };
        
        const staff = await staffService.updateStaff(userId, updateData);
        
        if (!staff) {
            return res.status(404).json({ 
                success: false,
                message: 'Staff profile not found' 
            });
        }
        
        res.json({ 
            success: true,
            message: 'Staff profile updated successfully',
            data: staff 
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

// DELETE /v1/staff/me
const deleteMe = asyncErrorHandler(async (req, res, next) => {
    try {
        const userId = req.user.userId || req.user.id;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in request'
            });
        }

        const result = await staffService.deleteStaffByUserId(userId);

        res.status(200).json({
            success: true,
            message: 'Staff profile deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

// PUT /v1/staff/updateStaffStatus/:id
const updateStaffStatus = asyncErrorHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isActive must be a boolean value'
            });
        }
        
        const staff = await staffService.updateStaffStatus(id, isActive);
        
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Staff not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Staff status updated successfully',
            data: staff
        });
    } catch (error) {
        next(error);
    }
});

module.exports = {
    getAllStaff,
    getStaffById,
    updateStaff,
    deleteStaff,
    createStaff,
    getMe,
    updateMe,
    deleteMe,
    updateStaffStatus
}; 