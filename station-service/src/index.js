require('dotenv').config();
const app = require('./app');
const { logger } = require('./config/logger');
const kafkaConsumer = require('./events/kafkaConsumer');

const PORT = process.env.PORT || 3005;

// Start Kafka consumer
kafkaConsumer.startConsumer()
    .then(() => {
        logger.info('Kafka consumer started successfully');
    })
    .catch(err => {
        logger.error('Failed to start Kafka consumer:', err);
    });

// Start the server
app.listen(PORT, () => {
    logger.info(`Station service is running on port ${PORT}`);
    console.log(`Station service is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    try {
        await kafkaConsumer.disconnect();
        logger.info('Kafka consumer disconnected');
    } catch (error) {
        logger.error('Error disconnecting Kafka consumer:', error);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    try {
        await kafkaConsumer.disconnect();
        logger.info('Kafka consumer disconnected');
    } catch (error) {
        logger.error('Error disconnecting Kafka consumer:', error);
    }
    process.exit(0);
}); 