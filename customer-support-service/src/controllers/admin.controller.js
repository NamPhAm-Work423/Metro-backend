const adminService = require('../services/admin.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');

// GET /v1/admins/getAllAdmins
const getAllAdmins = asyncErrorHandler(async (req, res, next) => {
    const admins = await adminService.getAllAdmins();
    res.status(200).json({ 
        success: true,
        message: 'Admins retrieved successfully', 
        data: admins,
        count: admins.length
    });
});

// GET /v1/admins/getAdminById/:id
const getAdminById = asyncErrorHandler(async (req, res, next) => {
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
});

// PUT /v1/admins/updateAdmin/:id
const updateAdmin = asyncErrorHandler(async (req, res, next) => {
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
        next(err);
    }
};



module.exports = {
    getAllAdmins,
    getAdminById,
    updateAdmin,
    getMe
}; 