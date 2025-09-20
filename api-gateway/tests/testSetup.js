// Global test setup - runs before all tests
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASS = 'test_pass';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.JWT_SECRET = 'test_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Disable tracing in test environment
process.env.OTEL_SDK_DISABLED = 'true';
process.env.OTEL_WRAP_EXPORT = 'false';
process.env.DIAG_LEVEL = 'ERROR';

// Mock logger early (this file exists)
jest.mock('../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    traceInfo: jest.fn(),
    traceError: jest.fn()
  },
  requestLogger: jest.fn((req, res, next) => next())
}));

// Mock database (this file exists)
jest.mock('../src/config/database', () => {
  const { Sequelize } = require('sequelize');
  const sequelize = new Sequelize('sqlite::memory:', { logging: false });
  
  // Mock the sequelize instance methods
  sequelize.authenticate = jest.fn().mockResolvedValue();
  sequelize.sync = jest.fn().mockResolvedValue();
  sequelize.close = jest.fn().mockResolvedValue();
  sequelize.define = jest.fn().mockReturnValue({
    hasOne: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    belongsToMany: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  });
  
  return sequelize;
});

// Mock Redis if it exists
jest.mock('../src/config/redis', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    isReady: true
  },
  getClient: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    incr: jest.fn(),
    keys: jest.fn()
  })),
  setWithExpiry: jest.fn(),
  initializeRedis: jest.fn().mockResolvedValue()
}), { virtual: true });

// Mock Email service if it exists
jest.mock('../src/services/email.service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(),
  verifyConnection: jest.fn().mockResolvedValue()
}), { virtual: true });

// Mock tracing module
jest.mock('../src/tracing', () => {
  const mockSpan = {
    setAttributes: jest.fn(),
    setStatus: jest.fn(),
    recordException: jest.fn(),
    end: jest.fn(),
  };

  const addCustomSpan = jest.fn().mockImplementation(async (name, fn) => {
    return await fn(mockSpan);
  });

  return {
    addCustomSpan,
    createCustomSpan: addCustomSpan,
    sdk: {
      start: jest.fn().mockResolvedValue(),
      shutdown: jest.fn().mockResolvedValue(),
    },
    SpanStatusCode: {
      OK: 1,
      ERROR: 2,
    },
  };
}); 