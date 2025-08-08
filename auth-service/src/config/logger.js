const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const logformat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const isTestEnv = process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test';

const transports = [];

// Console transport (silent during tests)
transports.push(
  new winston.transports.Console({
    silent: isTestEnv,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
);

// File transport (disabled during tests)
if (!isTestEnv) {
  transports.push(
    new DailyRotateFile({
      filename: path.join(__dirname, '..', 'logs', 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    })
  );
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: logformat,
  defaultMeta: { service: 'auth-service' },
  transports,
});

const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: duration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      responseTime: `${duration}ms`
    });
  });
  next();
};

  
module.exports = { logger, requestLogger };