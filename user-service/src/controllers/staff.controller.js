const staffService = require('../services/staff.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const { addCustomSpan } = require('../tracing');
const { logger } = require('../config/logger');

/**
 * Event: Create staff profile from user registration event
 * This is used by event consumers and should not depend on req/res.
 */
const createStaffFromUserEvent = async (userData) => {
    return addCustomSpan('event.staff.create-from-user', async (span) => {
        try {
            const { userId, username, email, firstName, lastName, phoneNumber, dateOfBirth } = userData;

            span.setAttributes({
                'operation.type': 'create',
                'operation.entity': 'staff',
                'event.source': 'user.created',
                'user.id': userId || 'missing'
            });

            const existing = await staffService.getStaffByUserId(userId);
            if (existing) {
                logger.info('Staff profile already exists (event)', { userId });
                span.setAttributes({ 'operation.result': 'exists' });
                return existing;
            }

            const staff = await staffService.createStaff({
                userId,
                username,
                email,
                firstName,
                lastName,
                phoneNumber: phoneNumber || '000000000',
                dateOfBirth: dateOfBirth || null
            });

            logger.info('Staff profile created from event', {
                userId,
                username,
                staffId: staff.staffId
            });

            span.setAttributes({ 'operation.success': true });
            return staff;
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false });
            logger.error('Error in createStaffFromUserEvent', {
                error: error.message,
                stack: error.stack,
                userData
            });
            throw error;
        }
    });
};

// GET /v1/staff/getAllStaff
const getAllStaff = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('staff.get-all', async (span) => {
        try {
            const staff = await staffService.getAllStaff();
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'staff', 'http.status_code': 200, 'operation.success': true, 'response.data.count': staff.length });
            return res.status(200).json({ 
                success: true,
                message: 'Staff retrieved successfully', 
                data: staff,
                count: staff.length
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_GET_ALL_STAFF    '
            });
        }
    });
});

// GET /v1/staff/getStaffById/:id
const getStaffById = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('staff.get-by-id', async (span) => {
        try {
            const { id } = req.params;
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'staff', 'staff.id': id });
            const staff = await staffService.getStaffById(id);
            
            if (!staff) {
                span.setAttributes({ 'operation.result': 'not_found', 'http.status_code': 404 });
                return res.status(404).json({
                    success: false,
                    message: 'Staff not found'
                });
            }
            
            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
            return res.status(200).json({
                success: true,
                message: 'Staff retrieved successfully',
                data: staff
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_GET_STAFF_BY_ID'
            });
        }
    });
});

// PUT /v1/staff/updateStaff/:id
const updateStaff = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('staff.update-by-id', async (span) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            span.setAttributes({ 'operation.type': 'update', 'operation.entity': 'staff', 'staff.id': id });
            const staff = await staffService.updateStaffById(id, updateData);
            
            if (!staff) {
                span.setAttributes({ 'operation.result': 'not_found', 'http.status_code': 404 });
                return res.status(404).json({
                    success: false,
                    message: 'Staff not found'
                });
            }

            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
            return res.status(200).json({
                success: true,
                message: 'Staff updated successfully',
                data: staff
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_UPDATE_STAFF'
            });
        }
    });
});

// DELETE /v1/staff/deleteStaff/:id
const deleteStaff = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('staff.delete-by-id', async (span) => {
        try {
            const { id } = req.params;
            span.setAttributes({ 'operation.type': 'delete', 'operation.entity': 'staff', 'staff.id': id });
            const result = await staffService.deleteStaffById(id);
            
            if (!result) {
                span.setAttributes({ 'operation.result': 'not_found', 'http.status_code': 404 });
                return res.status(404).json({
                    success: false,
                    message: 'Staff not found'
                });
            }
            
            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
            return res.status(200).json({
                success: true,
                message: 'Staff deleted successfully'
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_DELETE_STAFF'
            });
        }
    });
});

// POST /v1/staff/createStaff
const createStaff = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('staff.create', async (span) => {
        try {
            const { firstName, lastName, username, phoneNumber, dateOfBirth } = req.body;
            const userId = req.headers['x-user-id'] || req.user?.id;

            span.setAttributes({ 'operation.type': 'create', 'operation.entity': 'staff', 'user.id': userId });

            const existing = await staffService.getStaffByUserId(userId);
            if (existing) {
                span.setAttributes({ 'operation.result': 'conflict', 'http.status_code': 409 });
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
            
            span.setAttributes({ 'operation.success': true, 'http.status_code': 201 });
            return res.status(201).json({ 
                success: true, 
                message: 'Staff profile created successfully',
                data: staff 
            });
        } catch (err) {
            span.recordException(err);
            if (err.name === 'SequelizeValidationError') {
                span.setAttributes({ 'operation.success': false, 'http.status_code': 400 });
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: err.errors.map(e => ({ field: e.path, message: e.message }))
                });
            }
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_CREATE_STAFF'
            });
        }
    });
});

// GET /v1/staff/me
const getMe = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('staff.get-me', async (span) => {
        try {
            const staff = await staffService.getStaffByUserId(req.user.id);
            if (!staff) {
                span.setAttributes({ 'operation.result': 'not_found', 'http.status_code': 404 });
                return res.status(404).json({ 
                    success: false,
                    message: 'Staff profile not found' 
                });
            }
            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
            return res.status(200).json({ 
                success: true, 
                data: staff 
            });
        } catch (err) {
            span.recordException(err);
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_GET_ME'
            });
        }
    });
});

// PUT /v1/staff/me
const updateMe = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('staff.update-me', async (span) => {
        try {
            const { firstName, lastName, phoneNumber, dateOfBirth } = req.body;
            const userId = req.user.id;
            
            span.setAttributes({ 'operation.type': 'update', 'user.id': userId });

            const updateData = {
                firstName,
                lastName,
                phoneNumber,
                dateOfBirth
            };
            
            const staff = await staffService.updateStaff(userId, updateData);
            
            if (!staff) {
                span.setAttributes({ 'operation.result': 'not_found', 'http.status_code': 404 });
                return res.status(404).json({ 
                    success: false,
                    message: 'Staff profile not found' 
                });
            }
            
            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
            return res.status(200).json({ 
                success: true,
                message: 'Staff profile updated successfully',
                data: staff 
            });
        } catch (err) {
            span.recordException(err);
            if (err.name === 'SequelizeValidationError') {
                span.setAttributes({ 'operation.success': false, 'http.status_code': 400 });
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: err.errors.map(e => ({ field: e.path, message: e.message }))
                });
            }
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_UPDATE_ME'
            });
        }
    });
});

// DELETE /v1/staff/me
const deleteMe = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('staff.delete-me', async (span) => {
        try {
            const userId = req.user.userId || req.user.id;
            span.setAttributes({ 'operation.type': 'delete', 'user.id': userId || 'missing' });
            
            if (!userId) {
                span.setAttributes({ 'operation.success': false, 'http.status_code': 400 });
                return res.status(400).json({
                    success: false,
                    message: 'User ID not found in request'
                });
            }

            const result = await staffService.deleteStaffByUserId(userId);

            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
            return res.status(200).json({
                success: true,
                message: 'Staff profile deleted successfully'
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_DELETE_ME'
            });
        }
    });
});

// PUT /v1/staff/updateStaffStatus/:id
const updateStaffStatus = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('staff.update-status', async (span) => {
        try {
            const { id } = req.params;
            const { isActive } = req.body;
            
            span.setAttributes({ 'operation.type': 'update', 'operation.entity': 'staff', 'staff.id': id, 'staff.is_active': typeof isActive === 'boolean' ? isActive : 'invalid' });
            
            if (typeof isActive !== 'boolean') {
                span.setAttributes({ 'operation.success': false, 'http.status_code': 400 });
                return res.status(400).json({
                    success: false,
                    message: 'isActive must be a boolean value'
                });
            }
            
            const staff = await staffService.updateStaffStatus(id, isActive);
            
            if (!staff) {
                span.setAttributes({ 'operation.result': 'not_found', 'http.status_code': 404 });
                return res.status(404).json({
                    success: false,
                    message: 'Staff not found'
                });
            }
            
            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
            return res.status(200).json({
                success: true,
                message: 'Staff status updated successfully',
                data: staff
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_UPDATE_STAFF_STATUS'
            });
        }
    });
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
    updateStaffStatus,
    // Event handlers
    createStaffFromUserEvent
}; 