const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const userRepository = require('./repositories/user.repository');
const { logger } = require('../config/logger');
const emailService = require('./email.service');
const tokensService = require('./tokens.service');
const { sha256, generateResetToken } = require('../helpers/crypto.helper');
const { setImmediate } = require('timers');
const redisClient = require('../config/redis');
const userEventProducer = require('../events/user.producer.event');
const userEventConsumer = require('../events/user.consumer.event');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-secret-key';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';


class UserService {
    constructor() {
        // Start user event consumer (non-blocking)
        userEventConsumer.start()
            .catch((err) => logger.error('Failed to start UserEventConsumer', { error: err.message }));
    }



    /**
     * @description: This function is used to create a token for a user
     * @param {string} userId - The user id
     * @param {string} username - The user username
     * @returns {Object} - The token and refresh token
     */
    createToken = async (userId, username, roles) => {
        return tokensService.createTokens(userId, username, roles);
    }



    /**
     * @description: User registration
     * @param {Object} userData - User registration data
     * @returns {Object} - User data only (API key stored internally)
     */
    signup = async (userData) => {
        const { firstName, lastName, email, password, username, phoneNumber, dateOfBirth, gender, address, roles } = userData;
        
            
        // Check for existing user by email or username
        const existingUser = await userRepository.findOne({
            [Op.or]: [
                { email },
                { username }
            ]
        });
        
        if (existingUser) {
            if (existingUser.email === email) {
                throw new Error('Email already exists');
            } else {
                throw new Error('Username already exists');
            }
        }
        //If in roles have admin, reject create user
        if (Array.isArray(roles) && roles.includes('admin')) {
            throw new Error('Admin role is not allowed to be created');
        }
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user (Auth Service only stores auth data)
        const user = await userRepository.create({
            email,
            username,
            password: passwordHash,
            isVerified: process.env.NEED_EMAIL_VERIFICATION === 'true' ? false : true, 
            roles: roles || ['passenger'], // Default role is passenger
            loginAttempts: 0
        });
        
        // ALL non-essential operations moved to setImmediate (after response sent)
        setImmediate(() => {
            const backgroundTasks = [];
            //Dont need to return cookie here
            if(process.env.NEED_EMAIL_VERIFICATION === 'true'){
                // Generate verification token
                const verificationToken = jwt.sign(
                    { userId: user.id },
                    ACCESS_TOKEN_SECRET,
                    { expiresIn: '24h' }
                );

                if (typeof emailService.sendVerificationEmail === 'function') {
                    backgroundTasks.push(
                        Promise.resolve(emailService.sendVerificationEmail(email, verificationToken))
                            .then(() => {
                                logger.info('Verification email sent successfully', { 
                                    userId: user.id, 
                                    email: user.email 
                                });
                            })
                            .catch(err => {
                                logger.error('Failed to send verification email', { 
                                    error: err.message,
                                    userId: user.id,
                                    email: user.email 
                                });
                            })
                    );
                } else {
                    logger.warn('emailService.sendVerificationEmail is not a function - skipping', { userId: user.id, email: user.email });
                }
            } else {
                // If verification not required, send welcome email immediately (guard for mocked functions)
                if (typeof emailService.sendWelcomeEmail === 'function') {
                    backgroundTasks.push(
                        Promise.resolve(emailService.sendWelcomeEmail(email, firstName || username))
                            .then(() => {
                                logger.info('Welcome email sent successfully', { 
                                    userId: user.id, 
                                    email: user.email 
                                });
                            })
                            .catch(err => {
                                logger.error('Failed to send welcome email', { 
                                    error: err.message,
                                    userId: user.id,
                                    email: user.email 
                                });
                            })
                    );
                } else {
                    logger.warn('emailService.sendWelcomeEmail is not a function - skipping', { userId: user.id, email: user.email });
                }
            }

            const backgroundStartTime = process.hrtime.bigint();

            // Publish Kafka event in background (guard for undefined mocks)
            backgroundTasks.push(
                Promise.resolve(
                    userEventProducer.publishUserCreated({
                        userId: user.id,
                        email: user.email,
                        roles: user.roles,
                        username: user.username,
                        // Profile data from registration form (not stored in Auth Service)
                        firstName: firstName,
                        lastName: lastName,
                        phoneNumber: phoneNumber,
                        dateOfBirth: dateOfBirth,
                        gender: gender,
                        address: address,
                        status: 'activated',
                        roles: roles || ['passenger']
                    })
                ).catch(err => {
                    logger.error('Failed to publish user.created event in background', { 
                        error: err?.message || String(err),
                        userId: user.id
                    });
                })
            );

            // Execute all background tasks
            Promise.allSettled(backgroundTasks)
                .then(() => {
                    const backgroundEndTime = process.hrtime.bigint();
                    const backgroundTime = Number(backgroundEndTime - backgroundStartTime) / 1000000;
                    logger.debug('Background operations completed', {
                        backgroundTimeMs: backgroundTime.toFixed(2),
                        userId: user.id
                    });
                });
        });

        return { user };
    }

    resendVerification = async (email) => {
        const user = await userRepository.findOne({ email });
        if (!user) {
            throw new Error('User not found');
        }

        // Check if user is already verified
        if (user.isVerified) {
            throw new Error('User is already verified');
        }

        // Generate new verification token
        const verificationToken = jwt.sign(
            { userId: user.id },
            ACCESS_TOKEN_SECRET,
            { expiresIn: '24h' }
        );

        // Send verification email in background
        setImmediate(() => {
            if (typeof emailService.sendVerificationEmail === 'function') {
                Promise.resolve(emailService.sendVerificationEmail(email, verificationToken))
                    .then(() => {
                        logger.info('Verification email resent successfully', { 
                            userId: user.id, 
                            email: user.email 
                        });
                    })
                    .catch(err => {
                        logger.error('Failed to resend verification email', { 
                            error: err.message,
                            userId: user.id,
                            email: user.email 
                        });
                    });
            } else {
                logger.warn('emailService.sendVerificationEmail is not a function - skipping', { 
                    userId: user.id, 
                    email: user.email 
                });
            }
        });

        return { success: true, message: 'Verification email sent successfully' };
    }
    /**
     * @description: Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Object} - User data and tokens only (API key stored internally)
     */
    login = async (email, password) => {
        // Sanitize input to avoid whitespace issues
        const sanitizedPassword = (password || '').trim();

        // Find user and isActive is true
        const user = await userRepository.findOne({ email });
        if (!user) {
            throw new Error('User is not found');
        }

        // Check if account is locked BEFORE password check
        if (user.isLocked()) {
            throw new Error('Account is temporarily locked due to multiple failed login attempts');
        }

        // Check if user is verified (normalize possible string/number booleans from DB/mocks)
        if (process.env.NEED_EMAIL_VERIFICATION === 'true') {
            const isVerifiedNormalized = (user.isVerified === true)
                || (user.isVerified === 'true')
                || (user.isVerified === 1)
                || (user.isVerified === '1');
            if (!isVerifiedNormalized) {
                throw new Error('Please verify your email address');
            }
        }

        // Check password (only critical operation that must block)
        if (sanitizedPassword.length === 0) {
            throw new Error('Password is required');
        }

        const isPasswordValid = await bcrypt.compare(sanitizedPassword, user.password);
        if (!isPasswordValid) {
            setImmediate(() => {
                if (typeof user.incLoginAttempts === 'function') {
                    user.incLoginAttempts().catch(err => {
                        logger.error('Failed to increment login attempts in background', {
                            error: err.message,
                            userId: user.id,
                            email
                        });
                    });
                } else {
                    logger.warn('incLoginAttempts is not a function on user - skipping increment', {
                        userId: user.id,
                        email
                    });
                }
            });
            throw new Error('Invalid email or password');
        }

        // Generate tokens immediately (minimal, fast operation)
        const tokens = await this.createToken(user.id, user.username, user.roles);

        // Log successful login immediately for security audit
        logger.info('User logged in successfully', { userId: user.id, email });

        setImmediate(() => {
            // Array to track all background operations
            const maybeReset = typeof user.resetLoginAttempts === 'function' ? user.resetLoginAttempts() : Promise.resolve();
            const maybeUpdate = typeof user.update === 'function' ? user.update({ lastLoginAt: new Date() }) : Promise.resolve();

            const backgroundTasks = [
                Promise.resolve(maybeReset)
                    .then(() => logger.debug('Login attempts reset in background', { userId: user.id }))
                    .catch(err => logger.error('Failed to reset login attempts in background', {
                        error: err.message,
                        userId: user.id
                    })),
                
                Promise.resolve(maybeUpdate)
                    .then(() => logger.debug('Last login updated in background', { userId: user.id }))
                    .catch(err => logger.error('Failed to update last login in background', {
                        error: err.message,
                        userId: user.id
                    })),
                
                Promise.resolve(
                    userEventProducer.publishUserLogin({
                        userId: user.id,
                        email: user.email,
                        username: user.username,
                        roles: user.roles
                    })
                ).then(() => logger.debug('User.login event published in background', { userId: user.id, email }))
                 .catch(err => logger.error('Failed to publish user.login event in background', {
                        error: err.message,
                        userId: user.id
                 })),
            ];

            // Run all background tasks
            Promise.allSettled(backgroundTasks);
        });

        return { user, tokens };
    }

    /**
     * @description: Logout user
     * @param {string} userId - User ID
     * @returns {boolean} - Success status
     */
    logout = async (userId) => {
        await userRepository.updateById(userId, { lastLogoutAt: new Date() });
        return true;
    }

    /**
     * @description: Refresh access token
     * @param {string} refreshToken - Refresh token
     * @returns {Object} - New access token
     */
    refreshToken = async (refreshToken) => {
        // Verify refresh token to retrieve subject then delegate to token service
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

        const user = await userRepository.findByPk(decoded.userId);
        if (!user) {
            throw new Error('User not found');
        }

        const { accessToken } = await tokensService.refreshAccessToken(refreshToken, user);
        return { accessToken, user };
    }

    /**
     * @description: Request password reset
     * @param {string} email - User email
     * @returns {boolean} - Success status
     */
    forgotPassword = async (email) => {
        
        const user = await userRepository.findOne({ email });
        if (!user) {
            logger.info('Password reset requested for non-existent email (security)', { 
                email: email.substring(0, 3) + '***', 
            });
            return true;
        }

        // Generate secure random token
        const resetToken = generateResetToken();
        
        // Hash the token using sha256
        const hashedToken = sha256(resetToken);
        
        // Store hashed token in Redis with TTL of 10 minutes (600 seconds)
        const redisKey = `reset:${user.id}`;
        const ttlSeconds = 600; // 10 minutes
        
        const redisResult = await redisClient.withRedisClient(async (client) => {
            await client.set(redisKey, hashedToken, { EX: ttlSeconds });
        });
        
        if (redisResult === null) {
            logger.error('Failed to store reset token in Redis - client not available', { 
                userId: user.id, 
                email 
            });
            throw new Error('Failed to generate password reset token - Redis unavailable');
        }
        
        logger.info('Password reset token stored in Redis', { 
            userId: user.id, 
            email,
            redisKey,
            ttlSeconds 
        });

        // Send reset email with token and userId (async - don't wait)
        // Process email sending in background to improve response time
        setImmediate(async () => {
            try {
                await emailService.sendPasswordResetEmail(user.email, resetToken, user.id);
                logger.info('Password reset email sent successfully', { userId: user.id, email });
            } catch (emailError) {
                logger.error('Failed to send password reset email', { 
                    userId: user.id, 
                    email, 
                    error: emailError.message 
                });
                // Clean up Redis token if email fails
                const cleanupResult = await redisClient.withRedisClient(async (client) => {
                    await client.del(redisKey);
                });
                
                if (cleanupResult === null) {
                    logger.error('Failed to cleanup Redis token after email failure - client not available', { 
                        userId: user.id, 
                        redisKey
                    });
                } else {
                    logger.info('Cleaned up Redis token after email failure', { userId: user.id, redisKey });
                }
            }
        });

        logger.info('Password reset process completed', { 
            userId: user.id, 
            email,
        });

        return true;
    }

    /**
     * @description: Reset password with token and userId
     * @param {string} token - Reset token
     * @param {string} uid - User ID
     * @param {string} newPassword - New password
     * @returns {boolean} - Success status
     */
    resetPassword = async (token, uid, newPassword) => {
        // Validate input parameters
        if (!token || !uid || !newPassword) {
            throw new Error('Token, user ID, and new password are required');
        }
        
        // Trim and basic validation on new password
        const sanitizedPassword = String(newPassword).trim();
        if (sanitizedPassword.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        
        // Hash the provided token
        const hashedToken = sha256(token);
        
        // Get stored hashed token from Redis
        const redisKey = `reset:${uid}`;
        let storedHashedToken;
        
        storedHashedToken = await redisClient.withRedisClient(async (client) => {
            return await client.get(redisKey);
        });
        
        if (storedHashedToken === null) {
            logger.error('Failed to retrieve reset token from Redis - client not available', { 
                uid, 
                redisKey
            });
            throw new Error('Failed to verify reset token - Redis unavailable');
        }
        
        // Check if token exists and matches
        if (!storedHashedToken || hashedToken !== storedHashedToken) {
            logger.warn('Invalid or expired reset token attempt', { 
                uid, 
                hasToken: !!token,
                hasStoredToken: !!storedHashedToken,
                tokensMatch: hashedToken === storedHashedToken 
            });
            throw new Error('Invalid or expired reset token');
        }
        
        // Find user by ID
        const user = await userRepository.findByPk(uid);
        if (!user) {
            logger.warn('User not found during password reset', { uid });
            throw new Error('Invalid reset token');
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(sanitizedPassword, 10);

        // Update password and reset account lock status
        await user.update({
            password: passwordHash,
            passwordResetToken: null,
            passwordResetExpiry: null,
            loginAttempts: 0, // Reset login attempts
            lockUntil: null,  // Unlock account if locked
            accountLocked: false
        });

        // Delete the reset token from Redis
        const deleteResult = await redisClient.withRedisClient(async (client) => {
            await client.del(redisKey);
        });
        
        if (deleteResult === null) {
            logger.error('Failed to delete reset token from Redis - client not available', { 
                uid, 
                redisKey
            });
            // Don't throw error here as password was already updated successfully
        } else {
            logger.info('Reset token deleted from Redis', { uid, redisKey });
        }

        logger.info('Password reset successful', { userId: user.id, email: user.email });

        return true;
    }

    /**
     * @description: Check if password reset token exists for user
     * @param {string} userId - User ID
     * @returns {Object} - Token existence status and TTL
     */
    checkResetToken = async (userId) => {
        const redisKey = `reset:${userId}`;
        
        try {
            const result = await redisClient.withRedisClient(async (client) => {
                const token = await client.get(redisKey);
                const ttl = await client.ttl(redisKey);
                return { token: !!token, ttl };
            });
            
            logger.info('Reset token check', { 
                userId, 
                redisKey,
                hasToken: result.token,
                ttlSeconds: result.ttl 
            });
            
            return {
                exists: result.token,
                ttlSeconds: result.ttl,
                expiresAt: result.ttl > 0 ? new Date(Date.now() + result.ttl * 1000) : null
            };
        } catch (redisError) {
            logger.error('Failed to check reset token in Redis', { 
                userId, 
                redisKey,
                error: redisError.message 
            });
            return { exists: false, ttlSeconds: -1, expiresAt: null };
        }
    }

    /**
     * @description: Revoke/delete password reset token for user
     * @param {string} userId - User ID
     * @returns {boolean} - Deletion success
     */
    revokeResetToken = async (userId) => {
        const redisKey = `reset:${userId}`;
        
        try {
            const deleted = await redisClient.withRedisClient(async (client) => {
                return await client.del(redisKey);
            });
            
            logger.info('Reset token revoked', { 
                userId, 
                redisKey,
                deleted: deleted > 0 
            });
            
            return deleted > 0;
        } catch (redisError) {
            logger.error('Failed to revoke reset token in Redis', { 
                userId, 
                redisKey,
                error: redisError.message 
            });
            return false;
        }
    }

    /**
     * Delete user by userId (for event-driven deletion)
     * @param {string} userId - User ID
     * @returns {boolean} Deletion success
     */
    async deleteUserByUserId(userId) {
        try {
        const deletedRowCount = await userRepository.deleteById(userId);

            if (deletedRowCount > 0) {
                logger.info('User deleted successfully via Kafka event', { userId });
                return true;
            } else {
                logger.warn('User not found for deletion', { userId });
                return false;
            }
        } catch (error) {
            logger.error('Error deleting user via Kafka event', {
                error: error.message,
                userId
            });
            throw error;
        }
    }

    /**
     * Verify email token (used by controller)
     * @param {string} token - Verification token
     * @returns {Object} - Success status and message
     */
    async verifyEmailToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            const user = await userRepository.findByPk(decoded.userId);

            if (!user) {
                return {
                    success: false,
                    message: 'Invalid verification token'
                };
            }

            await user.update({ isVerified: true });

            logger.info('Email verified successfully through service', { 
                userId: user.id, 
                email: user.email 
            });

            // Send welcome email after successful verification
            setImmediate(() => {
                if (typeof emailService.sendWelcomeEmail === 'function') {
                    Promise.resolve(emailService.sendWelcomeEmail(user.email, user.username))
                        .then(() => {
                            logger.info('Welcome email sent after verification', { 
                                userId: user.id, 
                                email: user.email 
                            });
                        })
                        .catch(err => {
                            logger.error('Failed to send welcome email after verification', { 
                                error: err.message,
                                userId: user.id,
                                email: user.email 
                            });
                        });
                } else {
                    logger.warn('emailService.sendWelcomeEmail is not a function - skipping', { userId: user.id, email: user.email });
                }
            });

            return {
                success: true,
                message: 'Email verified successfully'
            };
        } catch (error) {
            logger.error('Error verifying email token:', {
                error: error.message,
                stack: error.stack
            });
            
            return {
                success: false,
                message: 'Invalid or expired verification token'
            };
        }
    }

    /**
     * Unlock user account (used by controller)
     * @param {string} userId - User ID to unlock
     * @param {string} adminId - Admin ID performing the action
     * @returns {Object} - Success status and data
     */
    async unlockUserAccount(userId, adminId) {
        try {
            const user = await userRepository.findByPk(userId);
            
            if (!user) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            // Store previous lock info for response
            const previousLockInfo = {
                accountLocked: user.accountLocked,
                lockUntil: user.lockUntil,
                loginAttempts: user.loginAttempts
            };

            // Reset login attempts and unlock account (both fields)
            await user.update({
                loginAttempts: 0,
                lockUntil: null,
                accountLocked: false
            });

            logger.info('User account unlocked by admin through service', { 
                userId: user.id, 
                userEmail: user.email,
                adminId 
            });

            return {
                success: true,
                data: {
                    userId: user.id,
                    email: user.email,
                    unlockedAt: new Date(),
                    previousLockInfo
                }
            };
        } catch (error) {
            logger.error('Error unlocking user account:', {
                error: error.message,
                stack: error.stack,
                userId,
                adminId
            });
            throw error;
        }
    }
}

module.exports = new UserService();
