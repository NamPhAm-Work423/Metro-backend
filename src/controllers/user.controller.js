const UserService = require('../services/user.service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserController {
    async register(req, res) {
        try {
            const { email, password, ...userData } = req.body;
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await UserService.createUser({
                email,
                password: hashedPassword,
                ...userData
            });
            res.status(201).json({ message: 'User registered successfully', user });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const user = await UserService.findByEmail(email);
            
            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { userId: user._id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({ token, user: { ...user.toObject(), password: undefined } });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getUserProfile(req, res) {
        try {
            const user = await UserService.getUserById(req.user.userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json({ ...user.toObject(), password: undefined });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateUserProfile(req, res) {
        try {
            const user = await UserService.updateUser(req.user.userId, req.body);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json({ ...user.toObject(), password: undefined });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async deleteUser(req, res) {
        try {
            const user = await UserService.deleteUser(req.params.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new UserController(); 