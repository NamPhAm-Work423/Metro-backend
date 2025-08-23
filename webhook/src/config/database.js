const mongoose = require('mongoose');
const { logger } = require('./logger');
require('dotenv').config();

class DatabaseConnection {
    constructor() {
        this.connection = null;
        this.isConnected = false;
    }

    /**
     * Build MongoDB connection URI
     * @returns {string} - MongoDB URI
     */
    buildConnectionUri() {
        if (process.env.MONGODB_URI) {
            return process.env.MONGODB_URI;
        }

        const host = process.env.MONGODB_HOST || 'localhost';
        const port = process.env.MONGODB_PORT || '27017';
        const dbName = process.env.MONGODB_DB_NAME || 'metro_webhook';
        const user = process.env.MONGODB_USER;
        const password = process.env.MONGODB_PASSWORD;

        let uri = `mongodb://`;
        
        if (user && password) {
            uri += `${user}:${password}@`;
        }
        
        uri += `${host}:${port}/${dbName}`;
        
        return uri;
    }

    /**
     * Get MongoDB connection options
     * @returns {Object} - Connection options
     */
    getConnectionOptions() {
        return {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false,
            retryWrites: true,
            retryReads: true,
            w: 'majority'
        };
    }

    /**
     * Connect to MongoDB with retry logic
     * @returns {Promise<void>}
     */
    async connect() {
        const maxRetries = 10;
        const baseDelay = 1000; // 1 second

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const uri = this.buildConnectionUri();
                const options = this.getConnectionOptions();

                logger.info(`Attempting MongoDB connection (${attempt}/${maxRetries})`, {
                    uri: uri.replace(/\/\/.*@/, '//***:***@'), // Hide credentials in logs
                    attempt
                });

                this.connection = await mongoose.connect(uri, options);
                this.isConnected = true;

                logger.info('MongoDB connection established successfully', {
                    host: process.env.MONGODB_HOST || 'localhost',
                    database: process.env.MONGODB_DB_NAME || 'metro_webhook',
                    readyState: mongoose.connection.readyState
                });

                this.setupEventHandlers();
                return;

            } catch (error) {
                logger.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed`, {
                    error: error.message,
                    attempt,
                    maxRetries
                });

                if (attempt === maxRetries) {
                    logger.error('Failed to connect to MongoDB after all retries');
                    throw new Error('MongoDB connection failed after all retry attempts');
                }

                const delay = baseDelay * Math.pow(2, attempt - 1);
                logger.info(`Retrying MongoDB connection in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Setup MongoDB event handlers
     */
    setupEventHandlers() {
        mongoose.connection.on('connected', () => {
            this.isConnected = true;
            logger.info('MongoDB connected successfully');
        });

        mongoose.connection.on('error', (error) => {
            this.isConnected = false;
            logger.error('MongoDB connection error', { error: error.message });
        });

        mongoose.connection.on('disconnected', () => {
            this.isConnected = false;
            logger.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            this.isConnected = true;
            logger.info('MongoDB reconnected');
        });

        // Handle process termination
        process.on('SIGINT', this.gracefulShutdown.bind(this));
        process.on('SIGTERM', this.gracefulShutdown.bind(this));
    }

    /**
     * Graceful shutdown
     */
    async gracefulShutdown() {
        try {
            if (this.connection) {
                await mongoose.connection.close();
                this.isConnected = false;
                logger.info('MongoDB connection closed gracefully');
            }
        } catch (error) {
            logger.error('Error during MongoDB graceful shutdown', { error: error.message });
        }
    }

    /**
     * Get connection status
     * @returns {boolean}
     */
    getConnectionStatus() {
        return this.isConnected && mongoose.connection.readyState === 1;
    }

    /**
     * Get MongoDB connection instance
     * @returns {mongoose.Connection}
     */
    getConnection() {
        return mongoose.connection;
    }
}

// Create singleton instance
const dbConnection = new DatabaseConnection();

module.exports = {
    connect: () => dbConnection.connect(),
    getConnection: () => dbConnection.getConnection(),
    getConnectionStatus: () => dbConnection.getConnectionStatus(),
    mongoose
}; 