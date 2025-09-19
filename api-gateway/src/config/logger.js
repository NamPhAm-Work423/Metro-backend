const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
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

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: logformat,
  defaultMeta: { service: 'api-gateway' },
  transports: [
    // Log to the console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Log to a file
    new DailyRotateFile({
      filename: path.join(__dirname, '..', 'logs', 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ]
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
      service: 'api-gateway'
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

  
module.exports = { logger, requestLogger };