const User = require('../models/user.model');
const { AppError } = require('../middlewares/errorHandler');

class UserService {
    async createUser(userData) {
        try {
            const existingUser = await User.findOne({ email: userData.email });
            if (existingUser) {
                throw new AppError('Email already registered', 400);
            }

            const user = new User(userData);
            await user.save();
            return user;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error creating user', 500);
        }
    }

    async findByEmail(email) {
        try {
            const user = await User.findOne({ email });
            return user;
        } catch (error) {
            throw new AppError('Error finding user', 500);
        }
    }

    async getUserById(id) {
        try {
            const user = await User.findById(id);
            if (!user) {
                throw new AppError('User not found', 404);
            }
            return user;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error finding user', 500);
        }
    }

    async updateUser(id, updateData) {
        try {
            if (updateData.email) {
                const existingUser = await User.findOne({ email: updateData.email });
                if (existingUser && existingUser._id.toString() !== id) {
                    throw new AppError('Email already in use', 400);
                }
            }

            const user = await User.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );
            if (!user) {
                throw new AppError('User not found', 404);
            }
            return user;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error updating user', 500);
        }
    }

    async deleteUser(id) {
        try {
            const user = await User.findByIdAndDelete(id);
            if (!user) {
                throw new AppError('User not found', 404);
            }
            return user;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error deleting user', 500);
        }
    }

    async getAllUsers(query = {}) {
        try {
            const users = await User.find(query).select('-password');
            return users;
        } catch (error) {
            throw new AppError('Error fetching users', 500);
        }
    }

    async updateUserRole(id, role) {
        try {
            const user = await User.findByIdAndUpdate(
                id,
                { role },
                { new: true, runValidators: true }
            );
            if (!user) {
                throw new AppError('User not found', 404);
            }
            return user;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error updating user role', 500);
        }
    }

    async resetPassword(id, newPassword) {
        try {
            const user = await User.findById(id);
            if (!user) {
                throw new AppError('User not found', 404);
            }

            user.password = newPassword;
            await user.save();
            return user;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError('Error resetting password', 500);
        }
    }

    async getUserStats() {
        try {
            const totalUsers = await User.countDocuments();
            const activeUsers = await User.countDocuments({ status: 'active' });
            const staffUsers = await User.countDocuments({ role: 'staff' });
            const adminUsers = await User.countDocuments({ role: 'admin' });

            return {
                totalUsers,
                activeUsers,
                staffUsers,
                adminUsers
            };
        } catch (error) {
            throw new AppError('Error fetching user statistics', 500);
        }
    }
}

module.exports = new UserService(); 