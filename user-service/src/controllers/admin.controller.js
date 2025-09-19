const adminService = require('../services/admin.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const { logger } = require('../config/logger');

// GET /v1/admins/getAllAdmins
const getAllAdmins = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('admin.get-all', async (span) => {
        try {
            const admins = await adminService.getAllAdmins();
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'admin', 'http.status_code': 200, 'operation.success': true, 'response.data.count': admins.length });
            return res.status(200).json({ 
            success: true,
            message: 'Admins retrieved successfully', 
            data: admins,
            count: admins.length
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            logger.error('Error getting all admins', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_GET_ALL_ADMINS'
            });
        }
    });
});

// GET /v1/admins/getAdminById/:id
const getAdminById = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('admin.get-by-id', async (span) => {
        try {
            const { id } = req.params;
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'admin', 'admin.id': id });
            const admin = await adminService.getAdminById(id);
            
            if (!admin) {
                span.setAttributes({ 'operation.result': 'not_found', 'http.status_code': 404 });
                return res.status(404).json({
                    success: false,
                    message: 'Admin not found'
                });
            }
            
            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
            return res.status(200).json({
                success: true,
                message: 'Admin retrieved successfully',
                data: admin
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            logger.error('Error getting admin by id', { error: error.message, adminId: req.params.id });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_GET_ADMIN_BY_ID'
            });
        }
    });
});

// PUT /v1/admins/updateAdmin/:id
const updateAdmin = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('admin.update-by-id', async (span) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            span.setAttributes({ 'operation.type': 'update', 'operation.entity': 'admin', 'admin.id': id });
            const admin = await adminService.updateAdminById(id, updateData);
            
            if (!admin) {
                span.setAttributes({ 'operation.result': 'not_found', 'http.status_code': 404 });
                return res.status(404).json({
                    success: false,
                    message: 'Admin not found'
                });
            }
            
            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
            return res.status(200).json({
                success: true,
                message: 'Admin updated successfully',
                data: admin
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            logger.error('Error updating admin', { error: error.message, adminId: req.params.id });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_UPDATE_ADMIN'
            });
        }
    });
});


// GET /v1/admins/me
const getMe = asyncErrorHandler(async (req, res, next) => {
    try {
        const admin = await adminService.getAdminByUserId(req.user.id);
        if (!admin) {
            return res.status(404).json({ 
                success: false,
                message: 'Admin profile not found' 
            });
        }
        return res.status(200).json({ 
            success: true,
            message: 'Admin retrieved successfully',
            data: admin 
        });
    } catch (err) {
        logger.error('Error getting admin profile', { error: err.message });
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'INTERNAL_ERROR_GET_ME'
        });
    }
});



module.exports = {
    getAllAdmins,
    getAdminById,
    updateAdmin,
    getMe
}; 