const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const getConfig = require('../config');
const axios = require('axios');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-secret-key';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const ACCESS_TOKEN_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

const gatewayConfig = getConfig();

function resolveUserServiceBaseUrl() {
    // Find user-service definition in config.json
    const svc = gatewayConfig.services.find((s) => s.name === 'user-service');
    if (svc && Array.isArray(svc.instances) && svc.instances.length > 0) {
        const inst = svc.instances[0]; // simple: pick first (could add LB later)
        return `http://${inst.host}:${inst.port}`;
    }
}

class UserService {
    /**
     * @description: This function is used to create a token for a user
     * @param {string} userId - The user id
     * @param {string} username - The user username
     * @returns {Object} - The token and refresh token
     */
    createToken = async (userId, username) => {
        const accessToken = jwt.sign(
            { userId, username},
            ACCESS_TOKEN_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
        );
        const refreshToken = jwt.sign(
            { userId },
            REFRESH_TOKEN_SECRET,
            { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
        );
        return { accessToken, refreshToken };
    }

    /**
     * @description: Register a new user
     * @param {Object} userData - User registration data
     * @returns {Object} - Created user and tokens
     */
    signup = async (userData) => {
        const { firstName, lastName, email, password, username } = userData;
        
        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            throw new Error('User already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = await User.create({
            firstName,
            lastName,
            email,
            username,
            password: passwordHash,
            isVerified: true,
            roles: ['user']
        });

        // Notify user-service to create domain profile (passenger by default)
        try {
            await axios.post(
                `${resolveUserServiceBaseUrl()}/api/v1/passenger`,
                { firstName, lastName, username, email },
                {
                    headers: {
                        'x-user-id': user.id,
                        'x-user-role': 'passenger',
                    },
                    timeout: 5000,
                }
            );
        } catch (err) {
            console.error('Failed to create passenger profile in user-service', err.message);
        }

        // Generate tokens
        const tokens = await this.createToken(user.id, user.username);

        return { user, tokens };
    }

    /**
     * @description: Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Object} - User data and tokens
     */
    login = async (email, password) => {
        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // Check if user is verified
        if (!user.isVerified) {
            throw new Error('Please verify your email address');
        }

        // Check if account is locked
        if (user.isLocked()) {
            throw new Error('Account is temporarily locked');
        }

        // Update last login
        await user.update({ lastLoginAt: new Date() });

        // Generate tokens
        const tokens = await this.createToken(user.id, user.username);

        return { user, tokens };
    }

    /**
     * @description: Logout user
     * @param {string} userId - User ID
     * @returns {boolean} - Success status
     */
    logout = async (userId) => {
        await User.update({ lastLogoutAt: new Date() }, { where: { id: userId } });
        return true;
    }

    /**
     * @description: Refresh access token
     * @param {string} refreshToken - Refresh token
     * @returns {Object} - New access token
     */
    refreshToken = async (refreshToken) => {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        
        // Find user
        const user = await User.findByPk(decoded.userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Generate new access token
        const accessToken = jwt.sign(
            { userId: user.id, username: user.username },
            ACCESS_TOKEN_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
        );

        return { accessToken };
    }

    /**
     * @description: Get current user profile
     * @param {string} userId - User ID
     * @returns {Object} - User profile
     */
    getProfile = async (userId) => {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    /**
     * @description: Request password reset
     * @param {string} email - User email
     * @returns {boolean} - Success status
     */
    forgotPassword = async (email) => {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Return success even if user doesn't exist for security
            return true;
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { userId: user.id },
            getConfig.getJwt().resetSecret,
            { expiresIn: '1h' }
        );

        // Store reset token in user record
        await user.update({ resetToken });

        // TODO: Send reset email with token
        // This would typically involve calling an email service

        return true;
    }

    /**
     * @description: Reset password with token
     * @param {string} token - Reset token
     * @param {string} newPassword - New password
     * @returns {boolean} - Success status
     */
    resetPassword = async (token, newPassword) => {
        // Verify reset token
        const decoded = jwt.verify(token, getConfig.getJwt().resetSecret);
        
        // Find user
        const user = await User.findByPk(decoded.userId);
        if (!user) {
            throw new Error('Invalid reset token');
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        await user.update({
            password: passwordHash,
            resetToken: null
        });

        return true;
    }
}

module.exports = new UserService();
