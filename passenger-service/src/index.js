const http = require('http');
const app = require('./app');
const sequelize = require('./config/database');
const userEventConsumer = require('./events/user.consumer.event');

const { logger } = require('./config/logger');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

sequelize.sync({ alter: true })
    .then(() => {
        logger.info('Database connected and synced successfully');
        
        const server = http.createServer(app);
        server.listen(PORT, () => {
            logger.info(`Passenger service running on port ${PORT}`, {
                environment: process.env.NODE_ENV || 'development',
                port: PORT,
                timestamp: new Date().toISOString()
            });
        });

        // Start user event consumer
        userEventConsumer.start().catch(error => {
            logger.error('Failed to start user event consumer', { error: error.message });
        });

        // Graceful shutdown
        const shutdown = async (signal) => {
            logger.info(`${signal} received, shutting down gracefully`);
            
            server.close(async () => {
                try {
                    await sequelize.close();
                    await userEventConsumer.stop();
                    logger.info('Passenger service shutdown complete');
                    process.exit(0);
                } catch (error) {
                    logger.error('Error during shutdown', { error: error.message });
                    process.exit(1);
                }
            });
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    })
    .catch(err => {
        logger.error('Unable to connect to the database', { error: err.message });
        process.exit(1);
    }); 