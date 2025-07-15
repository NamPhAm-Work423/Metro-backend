const { logger } = require('./config/logger');
const App = require('./app');
const SchedulerService = require('./services/scheduler.service');

/**
 * Initialize and start the public service
 */
async function startService() {
    const port = process.env.PORT || 3007;
    
    logger.info('Starting Public Service', {
        service: 'public-service',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        port: port,
        nodeVersion: process.version,
        pid: process.pid
    });

    try {
        // Create Express app
        const app = new App();
        
        // Validate configuration
        app.validateConfiguration();
        
        // Initialize and start scheduler (using gRPC-only approach)
        logger.info('Initializing scheduler service...');
        const schedulerService = new SchedulerService();
        await schedulerService.initialize();
        
        // Start HTTP server
        const expressApp = app.getApp();
        const server = expressApp.listen(port, () => {
            logger.info('Public Service started successfully', {
                port: port,
                environment: process.env.NODE_ENV || 'development',
                scheduler: 'enabled',
                endpoints: {
                    health: `/health`,
                }
            });
        });

        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.error(`Port ${port} is already in use`);
            } else {
                logger.error('Server error', { error: error.message });
            }
            process.exit(1);
        });

        // Graceful shutdown for server
        const gracefulShutdown = (signal) => {
            logger.info(`Received ${signal}, shutting down server gracefully`);
            
            server.close(async (err) => {
                if (err) {
                    logger.error('Error during server shutdown', { error: err.message });
                    process.exit(1);
                }
                
                try {
                    // Stop scheduler
                    schedulerService.stop();
                    
                    logger.info('Server shutdown completed');
                    process.exit(0);
                } catch (shutdownError) {
                    logger.error('Error during graceful shutdown', { 
                        error: shutdownError.message 
                    });
                    process.exit(1);
                }
            });
        };

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Keep the scheduler reference for potential management
        global.schedulerService = schedulerService;

    } catch (error) {
        logger.error('Failed to start Public Service', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

/**
 * Handle startup errors
 */
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception during startup', {
        error: error.message,
        stack: error.stack
    });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection during startup', {
        reason: reason?.message || reason,
        stack: reason?.stack
    });
    process.exit(1);
});

// Start the service
if (require.main === module) {
    startService();
}

module.exports = { startService }; 