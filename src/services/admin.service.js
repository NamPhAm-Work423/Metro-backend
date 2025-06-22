const Admin = require('../models/admin.model');
const { AppError } = require('../middlewares/errorHandler');

class AdminService {
    async createAdmin(adminData) {
        try {
            const admin = new Admin(adminData);
            await admin.save();
            return admin;
        } catch (error) {
            throw new AppError('Error creating admin', 500);
        }
    }

    async getAdminById(id) {
        try {
            const admin = await Admin.findById(id)
                .populate('user');
            if (!admin) {
                throw new AppError('Admin not found', 404);
            }
            return admin;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error finding admin', 500);
        }
    }

    async getAllAdmins() {
        try {
            const admins = await Admin.find()
                .populate('user');
            return admins;
        } catch (error) {
            throw new AppError('Error fetching admins', 500);
        }
    }

    async updateAdmin(id, updateData) {
        try {
            const admin = await Admin.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            ).populate('user');
            if (!admin) {
                throw new AppError('Admin not found', 404);
            }
            return admin;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error updating admin', 500);
        }
    }

    async deleteAdmin(id) {
        try {
            const admin = await Admin.findByIdAndDelete(id);
            if (!admin) {
                throw new AppError('Admin not found', 404);
            }
            return admin;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error deleting admin', 500);
        }
    }

    async getAdminByUserId(userId) {
        try {
            const admin = await Admin.findOne({ user: userId });
            if (!admin) {
                throw new AppError('Admin not found', 404);
            }
            return admin;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error finding admin', 500);
        }
    }

    async getAdminStats() {
        try {
            const totalAdmins = await Admin.countDocuments();
            const activeAdmins = await Admin.countDocuments({ status: 'active' });
            const superAdmins = await Admin.countDocuments({ role: 'super_admin' });

            return {
                totalAdmins,
                activeAdmins,
                superAdmins
            };
        } catch (error) {
            throw new AppError('Error fetching admin statistics', 500);
        }
    }
}

module.exports = new AdminService(); 