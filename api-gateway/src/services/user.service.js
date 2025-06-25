const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const getConfig = require('../config');
const axios = require('axios');
const kafkaProducer = require('../events/kafkaProducer');
const { logger } = require('../config/logger');
const emailService = require('./email.service');
const { Kafka } = require('kafkajs');
const keyService = require('./key.service');
const { createAPIToken, hashToken } = require('../helpers/crypto.helper');
const { Key } = require('../models/index.model');
const { setImmediate } = require('timers');

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
    constructor() {
        this.kafka = new Kafka({
            clientId: process.env.KAFKA_CLIENT_ID || 'api-gateway-consumer',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            connectionTimeout: 30000,
            requestTimeout: 25000,
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });

        this.consumer = this.kafka.consumer({ 
            groupId: process.env.KAFKA_GROUP_ID || 'api-gateway-group',
            sessionTimeout: 30000,
            rebalanceTimeout: 60000,
            heartbeatInterval: 3000,
            maxWaitTimeInMs: 5000,
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });

        this.isConnected = false;
        this.isSubscribed = false;
        this.isRunning = false;
        this.isConnecting = false; // Prevent multiple concurrent connection attempts
        this.reconnectTimeout = null;
        this.handlersSetup = false; // Track if event handlers are set up
        this.startKafkaConsumer();
    }

    /**
     * Handle user.deleted events
     * @param {Object} payload - The event payload
     */
    async handleUserDeletedEvent(payload) {
        try {
            logger.info('Processing user.deleted event', { 
                userId: payload.userId,
                source: payload.source 
            });

            // Delete user from API Gateway database
            await this.deleteUserByUserId(payload.userId);

            // Revoke all API keys for the user
            await keyService.revokeAllUserKeys(payload.userId);

            logger.info('User deletion processed successfully in API Gateway', {
                userId: payload.userId,
                email: payload.email,
                source: payload.source
            });

        } catch (error) {
            logger.error('Error handling user.deleted event', { 
                error: error.message, 
                stack: error.stack,
                payload: JSON.stringify(payload)
            });
        }
    }

    /**
     * Process incoming Kafka messages
     * @param {Object} messageData - Raw message data from Kafka
     */
    async processMessage(messageData) {
        const { topic, partition, message } = messageData;
        
        if (!message.value) {
            logger.warn('Received empty message', { topic, partition });
            return;
        }
        
        let data;
        try {
            data = JSON.parse(message.value.toString());
            logger.debug('Received Kafka message', { topic, messageData: data });
        } catch (e) {
            logger.error('JSON parse error for Kafka message', { 
                error: e.message,
                messageValue: message.value.toString()
            });
            return;
        }
        
        const payload = data.payload || data;
        
        // Route to appropriate handler based on topic
        if (topic === (process.env.USER_DELETED_TOPIC || 'user.deleted')) {
            await this.handleUserDeletedEvent(payload);
        } else if (topic === (process.env.PASSENGER_DELETED_TOPIC || 'passenger.deleted')) {
            // Just log passenger deletion events
            logger.info('Processing passenger.deleted event', { 
                passengerId: payload.passengerId,
                userId: payload.userId,
                source: payload.source 
            });
        } else {
            logger.warn('Unhandled topic', { topic });
        }
    }

    /**
     * Start the Kafka consumer
     */
    async startKafkaConsumer() {
        // Prevent multiple concurrent connection attempts
        if (this.isConnecting || this.isRunning) {
            logger.debug('Kafka consumer connection already in progress or running');
            return;
        }

        this.isConnecting = true;

        try {
            // Clean up any existing timeout
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }

            // Disconnect if already connected
            if (this.isConnected) {
                await this.consumer.disconnect();
                this.isConnected = false;
                this.isSubscribed = false;
                this.isRunning = false;
                this.handlersSetup = false; // Reset handlers flag
            }

            await this.consumer.connect();
            this.isConnected = true;
            logger.info('User service Kafka consumer connected successfully');
            
            // Subscribe to deletion topics
            const topics = [
                process.env.USER_DELETED_TOPIC || 'user.deleted',
                process.env.PASSENGER_DELETED_TOPIC || 'passenger.deleted'
            ];

            for (const topic of topics) {
                await this.consumer.subscribe({ 
                    topic, 
                    fromBeginning: false 
                });
                logger.info('User service subscribed to topic successfully', { topic });
            }
            this.isSubscribed = true;

            await this.consumer.run({
                eachMessage: this.processMessage.bind(this)
            });
            this.isRunning = true;

            logger.info('User service Kafka consumer is now running successfully');

            // Set up event handlers only after successful connection
            this.setupEventHandlers();

        } catch (error) {
            logger.error('User service Kafka consumer connection failed', { 
                error: error.message,
                stack: error.stack
            });
            
            // Reset state
            this.isConnected = false;
            this.isSubscribed = false;
            this.isRunning = false;
            this.handlersSetup = false; // Reset handlers flag
            
            // Retry after delay with exponential backoff
            this.scheduleReconnect();
        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * Set up event handlers for the consumer
     */
    setupEventHandlers() {
        // Only set up handlers once to prevent duplicates
        if (this.handlersSetup) {
            return;
        }

        this.consumer.on('consumer.crash', (error) => {
            logger.error('User service Kafka consumer crashed', { 
                error: error.message, 
                stack: error.stack 
            });
            
            this.isConnected = false;
            this.isSubscribed = false;
            this.isRunning = false;
            this.handlersSetup = false; // Reset handlers flag
            
            this.scheduleReconnect(10000); // 10 second delay for crashes
        });

        this.consumer.on('consumer.disconnect', () => {
            logger.warn('User service Kafka consumer disconnected');
            this.isConnected = false;
            this.isSubscribed = false;
            this.isRunning = false;
            this.handlersSetup = false; // Reset handlers flag
            
            this.scheduleReconnect();
        });

        this.consumer.on('consumer.connect', () => {
            logger.info('User service Kafka consumer reconnected');
            this.isConnected = true;
        });

        this.handlersSetup = true;
    }

    /**
     * Schedule a reconnection attempt with exponential backoff
     */
    scheduleReconnect(delay = 5000) {
        // Clear any existing timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        // Don't schedule if already connecting or connected
        if (this.isConnecting || this.isConnected) {
            return;
        }

        this.reconnectTimeout = setTimeout(() => {
            logger.info('Attempting to restart user service Kafka consumer');
            this.startKafkaConsumer();
        }, delay);
    }

    /**
     * Stop the Kafka consumer gracefully
     */
    async stopKafkaConsumer() {
        try {
            // Clear any pending reconnect timeout
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }

            if (this.isConnected) {
                await this.consumer.disconnect();
                this.isConnected = false;
                this.isSubscribed = false;
                this.isRunning = false;
                logger.info('User service Kafka consumer disconnected successfully');
            }
        } catch (error) {
            logger.error('Error disconnecting user service Kafka consumer', { 
                error: error.message 
            });
        }
    }

    /**
     * @description: This function is used to create a token for a user
     * @param {string} userId - The user id
     * @param {string} username - The user username
     * @returns {Object} - The token and refresh token
     */
    createToken = async (userId, username, roles) => {
        // Use minimal payload for fastest token generation
        const tokenPayload = { 
            id: userId,
            userId, 
            username,
            roles: roles || ['passenger']
        };

        // Generate both tokens in parallel (not sequential)
        const [accessToken, refreshToken] = await Promise.all([
            new Promise((resolve) => {
                const token = jwt.sign(
                    tokenPayload,
                    ACCESS_TOKEN_SECRET,
                    { expiresIn: ACCESS_TOKEN_EXPIRES_IN, algorithm: 'HS256' }
                );
                resolve(token);
            }),
            
            // Refresh token with minimal payload
            new Promise((resolve) => {
                const token = jwt.sign(
                    { userId, username },
                    REFRESH_TOKEN_SECRET,
                    { expiresIn: REFRESH_TOKEN_EXPIRES_IN, algorithm: 'HS256' }
                );
                resolve(token);
            })
        ]);

        return { accessToken, refreshToken };
    }

    /**
     * @description: Auto-generate API key for user if they don't have one
     * @param {string} userId - User ID
     * @returns {string|null} - Generated or existing API key ID
     */
    autoGenerateAPIKey = async (userId) => {
        try {
            const operationStartTime = process.hrtime.bigint();
            
            // Import Redis client helper
            const { withRedisClient } = require('../config/redis');
            
            // STEP 1: Check Redis cache first (ultra-fast lookup)
            const cacheKey = `user:${userId}:api_key`;
            const cachedKeyData = await withRedisClient(async (client) => {
                return await client.get(cacheKey);
            });
            
            if (cachedKeyData) {
                const keyData = JSON.parse(cachedKeyData);
                logger.debug('API key found in Redis cache', { 
                    userId, 
                    keyId: keyData.keyId,
                    cacheHit: true
                });
                return keyData.keyId;
            }

            // STEP 2: Check database for existing active key (fallback)
            const existingKey = await Key.findOne({
                where: {
                    userId: userId,
                    status: 'activated',
                },
                order: [['createdAt', 'DESC']]
            });

            if (existingKey) {
                // Cache the existing key in Redis for future requests
                const keyData = { keyId: existingKey.id, userId: userId };
                await withRedisClient(async (client) => {
                    await client.setEx(cacheKey, 86400, JSON.stringify(keyData)); // 24 hour cache
                });
                
                const operationEndTime = process.hrtime.bigint();
                const operationTime = Number(operationEndTime - operationStartTime) / 1000000;
                
                logger.info('Existing API key cached in Redis', { 
                    userId, 
                    keyId: existingKey.id,
                    operationTimeMs: operationTime.toFixed(2),
                    createdAt: existingKey.createdAt
                });
                return existingKey.id;
            }

            // Only create new API key if user doesn't have one
            const apiToken = createAPIToken();
            const hashedToken = hashToken(apiToken, process.env.HASH_SECRET);
            
            // Store in database for management
            const newKey = await Key.create({
                value: hashedToken,
                userId: userId,
                status: 'activated',
                lastUsedAt: new Date()
            });
            
            // Cache new key in Redis immediately
            const keyData = { keyId: newKey.id, userId: userId };
            await withRedisClient(async (client) => {
                await client.setEx(cacheKey, 86400, JSON.stringify(keyData)); // 24 hour cache
            });
            
            // Store in Redis for fast API key validation (separate from cache)
            await keyService.storeAPIKey(apiToken, { 
                userId: userId,
                keyId: newKey.id 
            });
            
            const operationEndTime = process.hrtime.bigint();
            const operationTime = Number(operationEndTime - operationStartTime) / 1000000;
            
            logger.info('New API key generated and cached', { 
                userId, 
                keyId: newKey.id,
                operationTimeMs: operationTime.toFixed(2)
            });
            
            return newKey.id;
        } catch (err) {
            logger.error('Failed to auto-generate API key', {
                error: err.message,
                stack: err.stack,
                userId: userId
            });
            return null;
        }
    }

    /**
     * @description: Get existing active API key for user
     * @param {string} userId - User ID
     * @returns {string|null} - Existing API key or null if none found
     */
    getExistingAPIKey = async (userId) => {
        try {
            // We can't retrieve the original API key from DB since we only store hashed versions
            // For simplicity, we'll generate a new one each time
            // In production, you might want to implement a different strategy
            return null;
        } catch (err) {
            logger.error('Failed to get existing API key', {
                error: err.message,
                userId: userId
            });
            return null;
        }
    }

    /**
     * @description: User registration
     * @param {Object} userData - User registration data
     * @returns {Object} - User data only (API key stored internally)
     */
    signup = async (userData) => {
        const { firstName, lastName, email, password, username, phoneNumber, dateOfBirth, gender, address, roles } = userData;
        
            
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            throw new Error('User already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user (API Gateway only stores auth data)
        const user = await User.create({
            email,
            username,
            password: passwordHash,
            isVerified: process.env.NEED_EMAIL_VERIFICATION,
            roles: roles || ['passenger'],
            loginAttempts: 0
        });
        
        // ALL non-essential operations moved to setImmediate (after response sent)
        setImmediate(() => {
            const backgroundTasks = [];

            if(process.env.NEED_EMAIL_VERIFICATION === 'false'){
                // Generate verification token
                const verificationToken = jwt.sign(
                    { userId: user.id },
                    ACCESS_TOKEN_SECRET,
                    { expiresIn: '24h' }
                );

                // Send verification email in background
                backgroundTasks.push(
                    emailService.sendVerificationEmail(email, verificationToken)
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
            }

            // Auto-generate API key in background
            backgroundTasks.push(
                this.autoGenerateAPIKey(user.id)
                    .then(() => logger.debug('API key generated in background', { userId: user.id }))
                    .catch(err => {
                        logger.error('Failed to auto-generate API key in background', {
                            error: err.message,
                            userId: user.id
                        });
                    })
            );

            // Publish Kafka event in background
            backgroundTasks.push(
                kafkaProducer.publish(process.env.USER_CREATED_TOPIC || 'user.created', user.id, {
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
                    status: 'activated',
                    roles: roles || ['passenger']
                })
                    .then(() => {
                        logger.info('User.created event published successfully', { 
                            userId: user.id, 
                            username: user.username,
                            email: user.email,
                            roles: user.roles 
                        });
                    })
                    .catch(err => {
                        logger.error('Failed to publish user.created event', { 
                            error: err.message,
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

    /**
     * @description: Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Object} - User data and tokens only (API key stored internally)
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
        if (process.env.NEED_EMAIL_VERIFICATION === 'false' && user.isVerified === 'false') {
            throw new Error('Please verify your email address');
        }

        // Check password (only critical operation that must block)
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            setImmediate(() => {
                user.incLoginAttempts().catch(err => {
                    logger.error('Failed to increment login attempts in background', {
                        error: err.message,
                        userId: user.id,
                        email
                    });
                });
            });
            throw new Error('Invalid email or password');
        }

        // Generate tokens immediately (minimal, fast operation)
        const tokens = await this.createToken(user.id, user.username, user.roles);

        // Log successful login immediately for security audit
        logger.info('User logged in successfully', { userId: user.id, email });

        setImmediate(() => {
            // Array to track all background operations
            const backgroundTasks = [
                // Reset login attempts
                user.resetLoginAttempts()
                    .then(() => logger.debug('Login attempts reset in background', { userId: user.id }))
                    .catch(err => logger.error('Failed to reset login attempts in background', {
                        error: err.message,
                        userId: user.id
                    })),
                
                // Update last login
                user.update({ lastLoginAt: new Date() })
                    .then(() => logger.debug('Last login updated in background', { userId: user.id }))
                    .catch(err => logger.error('Failed to update last login in background', {
                        error: err.message,
                        userId: user.id
                    })),
                
                // Auto-generate or refresh API key (only if user doesn't have one)
                this.autoGenerateAPIKey(user.id)
                    .then(() => logger.debug('API key processed in background', { userId: user.id }))
                    .catch(err => logger.error('Failed to auto-generate API key in background', {
                        error: err.message,
                        userId: user.id
                    }))
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
        const passwordHash = await bcrypt.hash(newPassword, 10);

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

    /**
     * Delete user by userId (for event-driven deletion)
     * @param {string} userId - User ID
     * @returns {boolean} Deletion success
     */
    async deleteUserByUserId(userId) {
        try {
            const deletedRowCount = await User.destroy({
                where: { id: userId }
            });

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
            const user = await User.findByPk(decoded.userId);

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
            const user = await User.findByPk(userId);
            
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
