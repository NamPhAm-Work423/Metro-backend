require('dotenv').config();

const app = require('./app');
const { logger } = require('./config/logger');
const sequelize = require('./config/database');
const { Route, Station, Stop, Train, Trip, RouteStation } = require('./models/index.model');

const PORT = process.env.PORT || 3002;
const SERVICE_NAME = 'transport-service';

// Database synchronization
async function syncDatabase() {
    try {
        // Test database connection
        await sequelize.authenticate();
        logger.info('Database connection established successfully');
        
        // Force sync to create tables
        await sequelize.sync({ force: false });
        logger.info('Database tables synchronized successfully');
        
        // Log table creation status
        const tables = await sequelize.getQueryInterface().showAllTables();
        logger.info('Available tables:', { tables });
        
    } catch (error) {
        logger.error('Database synchronization failed', { 
            error: error.message, 
            stack: error.stack 
        });
        throw error;
    }
}

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, starting graceful shutdown...`);
    
    try {
        
        // Close database connection
        await sequelize.close();
        logger.info('Database connection closed');
        
        // Exit process
        process.exit(0);
    } catch (error) {
        logger.error('Error during graceful shutdown', { error: error.message });
        process.exit(1);
    }
};

// Register shutdown signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the application
async function startApplication() {
    try {
        // Sync database first
        await syncDatabase();
        
        
        // Start HTTP server
        app.listen(PORT, () => {
            logger.info(`${SERVICE_NAME} running on port ${PORT}`, {
                port: PORT,
                environment: process.env.NODE_ENV || 'development',
                service: SERVICE_NAME,
                timestamp: new Date().toISOString()
            });
        });
        
    } catch (error) {
        logger.error('Failed to start application', { 
            error: error.message, 
            stack: error.stack 
        });
        process.exit(1);
    }
}

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { 
        error: error.message, 
        stack: error.stack 
    });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { 
        reason, 
        promise 
    });
    process.exit(1);
});

// Start the application
startApplication(); 