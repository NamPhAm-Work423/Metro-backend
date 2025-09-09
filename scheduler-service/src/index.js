require('dotenv').config();
const { logger } = require('./config/logger');
const { startGrpcServer } = require('./grpc/schedulerServer');
const { createHealthServer } = require('./http/health');

async function startService() {
  const serviceName = 'scheduler-service';
  logger.info('Starting Scheduler Service', {
    service: serviceName,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    pid: process.pid
  });

  try {
    const { server, registry } = startGrpcServer();

    // start lightweight HTTP health server
    const healthPort = process.env.PORT || 8010;
    const healthApp = createHealthServer(() => registry);
    const httpServer = healthApp.listen(healthPort, () => {
      logger.info('Health server started', { port: healthPort });
    });

    // graceful shutdown
    const shutdown = (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      try {
        registry.stopAll();
        server.tryShutdown(() => {
          logger.info('gRPC server shutdown complete');
          httpServer.close(() => process.exit(0));
        });
      } catch (e) {
        logger.error('Error during shutdown', { error: e.message });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start Scheduler Service', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

if (require.main === module) {
  startService();
}

module.exports = { startService };



