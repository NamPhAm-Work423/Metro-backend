const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const { logger } = require('./config/logger');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler.middleware');
const routes = require('./routes');

class App {
    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // Trust proxy for accurate IP addresses
        this.app.set('trust proxy', true);

        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: false
        }));

        // CORS middleware
        this.app.use(cors({
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true
        }));

        // Compression middleware
        this.app.use(compression());

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging middleware
        this.app.use((req, res, next) => {
            const startTime = Date.now();
            
            // Log incoming request
            logger.info('Incoming request', {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                contentLength: req.get('Content-Length'),
                timestamp: new Date().toISOString()
            });

            // Override res.end to log response
            const originalEnd = res.end;
            res.end = function(chunk, encoding) {
                const duration = Date.now() - startTime;
                
                logger.info('Request completed', {
                    method: req.method,
                    url: req.originalUrl,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    ip: req.ip,
                    timestamp: new Date().toISOString()
                });

                originalEnd.call(this, chunk, encoding);
            };

            next();
        });

        // Health check endpoint (before rate limiting)
        this.app.get('/ping', (req, res) => {
            res.json({
                status: 'ok',
                service: 'public-service',
                timestamp: new Date().toISOString()
            });
        });

        logger.info('Middleware setup completed');
    }

    /**
     * Setup application routes
     */
    setupRoutes() {
        // Mount all routes
        this.app.use('/', routes);

        logger.info('Routes setup completed');
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // 404 handler
        this.app.use(notFoundHandler);

        // Global error handler
        this.app.use(errorHandler);

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception', {
                error: error.message,
                stack: error.stack
            });
            
            // Give time for logs to be written, then exit
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Promise Rejection', {
                reason: reason?.message || reason,
                stack: reason?.stack,
                promise: promise.toString()
            });
            
            // Give time for logs to be written, then exit
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });

        // Graceful shutdown handling
        const gracefulShutdown = (signal) => {
            logger.info(`Received ${signal}, starting graceful shutdown`);
            
            this.shutdown().then(() => {
                logger.info('Graceful shutdown completed');
                process.exit(0);
            }).catch((error) => {
                logger.error('Error during shutdown', { error: error.message });
                process.exit(1);
            });
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        logger.info('Error handling setup completed');
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        logger.info('Starting application shutdown');

        try {            
            logger.info('Application shutdown completed successfully');
        } catch (error) {
            logger.error('Error during application shutdown', { error: error.message });
            throw error;
        }
    }

    /**
     * Get Express app instance
     */
    getApp() {
        return this.app;
    }

    /**
     * Simple configuration validation
     */
    validateConfiguration() {
        const port = process.env.PORT || 3000;
        if (!port) {
            logger.error('PORT is required');
            throw new Error('PORT is required');
        }
        logger.info('Configuration validation passed');
        return true;
    }
}

module.exports = App; 