const adminService = require('../services/admin.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const { logger } = require('../config/logger');

// GET /v1/admins/getAllAdmins
const getAllAdmins = asyncErrorHandler(async (req, res, next) => {
    try {
        const admins = await adminService.getAllAdmins();
        res.status(200).json({ 
        success: true,
        message: 'Admins retrieved successfully', 
        data: admins,
        count: admins.length
        });
    } catch (error) {
        logger.error('Error getting all admins', { error: error.message });
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'INTERNAL_ERROR_GET_ALL_ADMINS'
        });
    }
});

// GET /v1/admins/getAdminById/:id
const getAdminById = asyncErrorHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const admin = await adminService.getAdminById(id);
        
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Admin retrieved successfully',
            data: admin
        });
    } catch (error) {
        logger.error('Error getting admin by id', { error: error.message, adminId: req.params.id });
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'INTERNAL_ERROR_GET_ADMIN_BY_ID'
        });
    }
});

// PUT /v1/admins/updateAdmin/:id
const updateAdmin = asyncErrorHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const admin = await adminService.updateAdminById(id, updateData);
        
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Admin updated successfully',
            data: admin
        });
    } catch (error) {
        logger.error('Error updating admin', { error: error.message, adminId: req.params.id });
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'INTERNAL_ERROR_UPDATE_ADMIN'
        });
    }
});


// GET /v1/admins/me
const getMe = async (req, res, next) => {
    try {
        const admin = await adminService.getAdminByUserId(req.user.id);
        if (!admin) {
            return res.status(404).json({ 
                success: false,
                message: 'Admin profile not found' 
            });
        }
        res.json({ 
            success: true, 
            data: admin 
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'INTERNAL_ERROR_GET_ME'
        });
    }
};



module.exports = {
    getAllAdmins,
    getAdminById,
    updateAdmin,
    getMe
}; 