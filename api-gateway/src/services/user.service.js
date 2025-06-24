const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const getConfig = require('../config');
const axios = require('axios');
const kafkaProducer = require('../events/kafkaProducer');
const { logger } = require('../config/logger');
const emailService = require('./email.service');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-secret-key';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const ACCESS_TOKEN_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

const gatewayConfig = getConfig();

function resolveUserServiceBaseUrl() {
    // Find user-service definition in config.json
    const svc = gatewayConfig.services.find((s) => s.name === 'passenger-service');
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
    createToken = async (userId, username, roles) => {
        const accessToken = jwt.sign(
            { 
                id: userId,
                userId, 
                username,
                roles: roles || ['passenger']
            },
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
        const { firstName, lastName, email, password, username, phoneNumber, dateOfBirth, gender, address, roles } = userData;
        
        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            throw new Error('User already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user (API Gateway only stores auth data)
        const user = await User.create({
            email,
            username,
            password: passwordHash,
            isVerified: process.env.NEED_EMAIL_VERIFICATION, // Require email verification
            roles: roles || ['passenger']
        });

        // Generate verification token
        const verificationToken = jwt.sign(
            { userId: user.id },
            ACCESS_TOKEN_SECRET,
            { expiresIn: '24h' }
        );

        // Send verification email
        try {
            await emailService.sendVerificationEmail(email, verificationToken);
            logger.info('Verification email sent successfully', { 
                userId: user.id, 
                email: user.email 
            });
        } catch (err) {
            logger.error('Failed to send verification email', { 
                error: err.message,
                userId: user.id,
                email: user.email 
            });
            // Don't fail registration if email fails - user can request resend
        }


        // Publish user.created event with profile data for Passenger Service
        try {
            await kafkaProducer.publish(process.env.USER_CREATED_TOPIC || 'user.created', user.id, {
                userId: user.id,
                email: user.email,
                roles: user.roles,
                username: user.username,
                // Profile data from registration form (not stored in API Gateway)
                firstName: firstName,
                lastName: lastName,
                phoneNumber: phoneNumber,
                dateOfBirth: dateOfBirth,
                gender: gender,
                address: address,
                isActive: true,
                roles: roles || ['passenger']
            });
            logger.info('User.created event published successfully', { 
                userId: user.id, 
                username: user.username,
                email: user.email,
                roles: user.roles 
            });
        } catch (err) {
            logger.error('Failed to publish user.created event', { error: err.message });
            // Consider rolling back user creation if event publishing fails
            // await user.destroy();
            // throw new Error('Registration failed - please try again');
        }

        return { user };
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

        // Check if account is locked BEFORE password check
        if (user.isLocked()) {
            throw new Error('Account is temporarily locked due to multiple failed login attempts');
        }

        // Check if user is verified
        if (!user.isVerified) {
            throw new Error('Please verify your email address');
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            // Increment login attempts on failed password
            await user.incLoginAttempts();
            throw new Error('Invalid email or password');
        }

        // Reset login attempts on successful login
        await user.resetLoginAttempts();

        // Update last login
        await user.update({ lastLoginAt: new Date() });

        // Generate tokens
        const tokens = await this.createToken(user.id, user.username, user.roles);

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
            { 
                id: user.id,
                userId: user.id, 
                username: user.username,
                roles: user.roles
            },
            ACCESS_TOKEN_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
        );

        return { accessToken };
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

        // Generate reset token using the same secret as refresh tokens
        const resetToken = jwt.sign(
            { userId: user.id, type: 'password_reset' },
            process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
            { expiresIn: '1h' }
        );

        // Store reset token in user record
        await user.update({ 
            passwordResetToken: resetToken,
            passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
        });

        // Send reset email
        try {
            await emailService.sendPasswordResetEmail(user.email, resetToken);
            logger.info('Password reset email sent successfully', { userId: user.id, email });
        } catch (emailError) {
            logger.error('Failed to send password reset email', { 
                userId: user.id, 
                email, 
                error: emailError.message 
            });
            // Continue without throwing error to prevent exposing email service issues
        }

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
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret');
        
        // Check token type
        if (decoded.type !== 'password_reset') {
            throw new Error('Invalid reset token');
        }
        
        // Find user
        const user = await User.findByPk(decoded.userId);
        if (!user) {
            throw new Error('Invalid reset token');
        }

        // Check if token matches stored token and hasn't expired
        if (user.passwordResetToken !== token || new Date() > user.passwordResetExpiry) {
            throw new Error('Invalid or expired reset token');
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 12);

        // Update password and clear reset token
        await user.update({
            password: passwordHash,
            passwordResetToken: null,
            passwordResetExpiry: null,
            loginAttempts: 0, // Reset login attempts
            lockUntil: null,  // Unlock account if locked
            accountLocked: false
        });

        logger.info('Password reset successful', { userId: user.id, email: user.email });

        return true;
    }
}

module.exports = new UserService();
