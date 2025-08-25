// Global test setup
jest.setTimeout(15000); // Longer timeout for gRPC tests

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3007';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'testpass';
process.env.TRANSPORT_GRPC_HOST = 'localhost';
process.env.TRANSPORT_GRPC_PORT = '50051';
process.env.FARE_GRPC_HOST = 'localhost';
process.env.FARE_GRPC_PORT = '50052';
process.env.SCHEDULER_ENABLED = 'false'; // Disable scheduler in tests
process.env.SCHEDULER_CRON = '0 * * * *';

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    flushDb: jest.fn(),
    ping: jest.fn(),
    on: jest.fn(),
  }))
}));

// Mock gRPC
jest.mock('@grpc/grpc-js', () => ({
  Server: jest.fn(),
  loadPackageDefinition: jest.fn(),
  credentials: {
    createInsecure: jest.fn()
  },
  status: {
    OK: 0,
    NOT_FOUND: 5,
    INTERNAL: 13,
    UNAVAILABLE: 14
  }
}));

jest.mock('@grpc/proto-loader', () => ({
  loadSync: jest.fn(() => ({}))
}));

// Mock prom-client for tests to avoid requiring native metrics in CI
jest.mock('prom-client', () => {
  class Registry {
    constructor() { this._metrics = []; this.contentType = 'text/plain'; }
    registerMetric(metric) { this._metrics.push(metric); }
    async metrics() { return '# mock metrics'; }
  }
  class Histogram {
    constructor() { this.observe = jest.fn(); this.startTimer = jest.fn(() => jest.fn()); }
    labels() { return { observe: jest.fn() }; }
  }
  class Counter {
    constructor() { this.inc = jest.fn(); }
    labels() { return { inc: jest.fn() }; }
  }
  const collectDefaultMetrics = jest.fn();
  return { Registry, Histogram, Counter, collectDefaultMetrics };
}, { virtual: true });

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}; 