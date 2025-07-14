const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logLevel = process.env.LOG_LEVEL || 'info';
const logMaxSize = process.env.LOG_MAX_SIZE || '20m';
const logMaxFiles = process.env.LOG_MAX_FILES || '14d';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const serviceName = process.env.SERVICE_NAME || 'public-service';
        return JSON.stringify({
            timestamp,
            level,
            service: serviceName,
            message,
            ...meta
        });
    })
);

// Create transports
const transports = [
    // Console transport for development
    new winston.transports.Console({
        level: logLevel,
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${level}]: ${message} ${metaString}`;
            })
        )
    }),

    // Daily rotate file for all logs
    new DailyRotateFile({
        filename: 'logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: logLevel,
        format: logFormat,
        maxSize: logMaxSize,
        maxFiles: logMaxFiles,
        createSymlink: true,
        symlinkName: 'application.log'
    }),

    // Daily rotate file for error logs only
    new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: logFormat,
        maxSize: logMaxSize,
        maxFiles: logMaxFiles,
        createSymlink: true,
        symlinkName: 'error.log'
    })
];

// Create logger instance
const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports,
    exitOnError: false
});

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
    new DailyRotateFile({
        filename: 'logs/exceptions-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: logMaxSize,
        maxFiles: logMaxFiles
    })
);

logger.rejections.handle(
    new DailyRotateFile({
        filename: 'logs/rejections-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: logMaxSize,
        maxFiles: logMaxFiles
    })
);

// Create logs directory if it doesn't exist
const fs = require('fs');
const path = require('path');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Log application startup
logger.info('Logger initialized', {
    level: logLevel,
    maxSize: logMaxSize,
    maxFiles: logMaxFiles,
    transports: transports.length
});

module.exports = {
    logger
}; 