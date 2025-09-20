// IMPORTANT: Tracing must be initialized FIRST before any other imports
require('./tracing');

require('dotenv').config();

const app = require('./app');
const { logger } = require('./config/logger');
const sequelize = require('./config/database');
const { initializeRedis } = require('./config/redis');
const passengerCacheConsumer = require('./events/passengerCache.consumer.event');
const PaymentConsumer = require('./events/payment.consumer.event');
const { startCombinedGrpcServer } = require('./grpc/combinedServer');
const { runSeeds } = require('./seed/index');
const PORT = process.env.PORT || 3003;
const SERVICE_NAME = 'ticket-service';

// Initialize Payment Consumer
const paymentConsumer = new PaymentConsumer();

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
        // Stop passenger cache consumer
        if (passengerCacheConsumer) {
            await passengerCacheConsumer.stop();
            logger.info('Passenger cache consumer stopped successfully');
        }
        
        // Stop payment consumer
        if (paymentConsumer) {
            await paymentConsumer.stop();
            logger.info('Payment consumer stopped successfully');
        }
        
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
        // Skip service initialization during tests
        if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
            logger.info('Test environment detected, skipping service initialization');
            return;
        }

        // Sync database first
        await syncDatabase();

        // Run seeds if available
        if (typeof runSeeds === 'function') {
            await runSeeds();
        }
        
        // Initialize Redis
        await initializeRedis();
        logger.info('Redis initialized successfully');
        
        // Start passenger cache consumer
        if (passengerCacheConsumer) {
            await passengerCacheConsumer.start();
            logger.info('Passenger cache consumer started successfully');
        }
        
        // Start payment consumer
        if (paymentConsumer) {
            await paymentConsumer.start();
            logger.info('Payment consumer started successfully');
        }
        
        // Start combined gRPC server (single bind on TICKET_GRPC_PORT)
        await startCombinedGrpcServer();
        logger.info('Combined gRPC server started successfully');
        
        // Start HTTP server
        app.listen(PORT, () => {
            logger.info(`${SERVICE_NAME} HTTP server running on port ${PORT}`, {
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