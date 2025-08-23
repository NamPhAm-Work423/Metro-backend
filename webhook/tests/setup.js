// Test setup file
process.env.NODE_ENV = 'test';
process.env.PORT = 3001;
process.env.MONGODB_URI = 'mongodb://localhost:27017/metro_webhook_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.KAFKA_BROKERS = 'localhost:9092';
process.env.PAYPAL_CLIENT_ID = 'test_client_id';
process.env.PAYPAL_CLIENT_SECRET = 'test_client_secret';
process.env.PAYPAL_MODE = 'sandbox';
process.env.API_GATEWAY_ORIGIN = 'http://localhost:3000';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:3001';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock winston logger
jest.mock('../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  requestLogger: jest.fn(),
}));

// Mock metrics
jest.mock('../src/config/metrics', () => ({
  register: {
    contentType: 'text/plain',
    metrics: jest.fn().mockResolvedValue('test_metrics'),
  },
  errorCount: {
    inc: jest.fn(),
  },
}));

// Mock Redis
jest.mock('../src/config/redis', () => ({
  getClient: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
  })),
}));

// Mock Kafka
jest.mock('../src/kafka/kafkaProducer', () => ({
  publish: jest.fn().mockResolvedValue(true),
}));

// Mock events
jest.mock('../src/events/paypal.hook.producer', () => ({
  publishWebhookEvent: jest.fn().mockResolvedValue(true),
}));

// Mock PayPal Hook model
jest.mock('../src/models/paypal.hook.model', () => {
  return jest.fn().mockImplementation(() => ({
    extractPayPalBusinessData: jest.fn().mockResolvedValue(true),
    markAsProcessing: jest.fn().mockResolvedValue(true),
    markAsProcessed: jest.fn().mockResolvedValue(true),
    markAsDuplicate: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(true),
    findByIdempotencyKey: jest.fn().mockResolvedValue(null),
  }));
});

// Mock PayPal Webhook Service
jest.mock('../src/services/paypalWebhook.service', () => {
  return jest.fn().mockImplementation(() => ({
    processWebhook: jest.fn().mockResolvedValue({
      success: true,
      status: 'processed',
      webhookId: 'WH-123456789',
      eventsPublished: 1,
      signatureVerified: true,
    }),
    getStatistics: jest.fn().mockResolvedValue({
      webhooks: {
        received: 10,
        processed: 8,
        failed: 2,
        duplicates: 1,
      },
      events: {
        published: 8,
        failed: 2,
      },
    }),
    retryFailedWebhooks: jest.fn().mockResolvedValue([
      { success: true, webhookId: 'WH-123456789' },
      { success: true, webhookId: 'WH-987654321' },
    ]),
    validateEventStructure: jest.fn().mockReturnValue(true),
  }));
});

// Mock rate limiter middleware
jest.mock('../src/middlewares/rateLimiter', () => ({
  defaultRateLimiter: jest.fn((req, res, next) => next()),
}));

// Mock metrics middleware
jest.mock('../src/middlewares/metrics.middleware', () => 
  jest.fn((req, res, next) => next())
);
