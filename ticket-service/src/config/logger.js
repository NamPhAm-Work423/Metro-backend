const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const { trace } = require('@opentelemetry/api');

// Custom format to include trace information
const tracingFormat = winston.format((info) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    info.traceId = spanContext.traceId;
    info.spanId = spanContext.spanId;
  }
  return info;
});

const logformat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  tracingFormat(),
  winston.format.json()
);

const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

// Build transports based on environment
const transports = [];

// Always add console transport, silence during tests
transports.push(
  new winston.transports.Console({
    silent: isTestEnv,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
);

// Add file transports only when not running tests
if (!isTestEnv) {
  const logsDir = path.join(__dirname, '..', 'logs');
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (_) {
    // If directory creation fails, we still proceed without crashing
  }

  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  );

  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    })
  );
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: logformat,
  defaultMeta: { service: 'ticket-service' },
  transports,
});

const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const span = trace.getActiveSpan();
    
    // Add trace context to span if available
    if (span) {
      span.setAttributes({
        'http.method': req.method,
        'http.url': req.originalUrl,
        'http.status_code': res.statusCode,
        'http.duration_ms': duration,
        'http.user_agent': req.headers['user-agent'],
        'request.ip': req.ip
      });
    }
    
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: duration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      responseTime: `${duration}ms`,
      service: 'ticket-service'
    });
  });
  next();
};

// Helper functions for structured logging with traces
logger.traceInfo = (message, data = {}) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    logger.info(message, {
      ...data,
      traceId: spanContext.traceId,
      spanId: spanContext.spanId
    });
  } else {
    logger.info(message, data);
  }
};

logger.traceError = (message, error, data = {}) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    span.recordException(error);
    logger.error(message, {
      ...data,
      error: error.message,
      stack: error.stack,
      traceId: spanContext.traceId,
      spanId: spanContext.spanId
    });
  } else {
    logger.error(message, { ...data, error: error.message, stack: error.stack });
  }
};

logger.traceWarn = (message, data = {}) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    logger.warn(message, {
      ...data,
      traceId: spanContext.traceId,
      spanId: spanContext.spanId
    });
  } else {
    logger.warn(message, data);
  }
};

logger.traceDebug = (message, data = {}) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    logger.debug(message, {
      ...data,
      traceId: spanContext.traceId,
      spanId: spanContext.spanId
    });
  } else {
    logger.debug(message, data);
  }
};

module.exports = { logger, requestLogger }; 