require('dotenv').config();

const app = require('./app');
const { logger } = require('./config/logger');
const { connect: connectMongoDB } = require('./config/database');
const { initializeRedis } = require('./config/redis');
const { disconnect: disconnectKafka } = require('./kafka/kafkaProducer');

const PORT = process.env.PORT || 3003;
const SERVICE_NAME = 'webhook-service';

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, starting graceful shutdown...`);
    
    try {
        // Disconnect Kafka producer
        await disconnectKafka();
        logger.info('Kafka producer disconnected');
        
        // MongoDB will auto-close through its internal handlers
        logger.info('Database connections handled by MongoDB driver');
        
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
        // Connect to MongoDB
        await connectMongoDB();
        logger.info('MongoDB connection established successfully');
        
        // Initialize Redis
        await initializeRedis();
        logger.info('Redis connection established successfully');
        
        // Start HTTP server
        app.listen(PORT, () => {
            logger.info(`${SERVICE_NAME} running on port ${PORT}`, {
                port: PORT,
                environment: process.env.NODE_ENV || 'development',
                service: SERVICE_NAME,
                timestamp: new Date().toISOString(),
                features: [
                    'PayPal webhook processing',
                    'MongoDB audit logging',
                    'Redis idempotency protection',
                    'Kafka event publishing',
                    'Signature verification',
                    'Rate limiting'
                ]
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