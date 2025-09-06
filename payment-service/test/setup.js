// Test setup file to configure Jest environment
// This file runs before each test file

// Suppress KafkaJS warnings during tests
process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';

// Suppress console warnings for cleaner test output
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Only suppress specific warnings, not all warnings
console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string') {
    // Suppress KafkaJS partitioner warnings
    if (message.includes('KafkaJS v2.0.0 switched default partitioner')) {
      return;
    }
  }
  originalConsoleWarn.apply(console, args);
};

// Suppress specific error logs that are expected in tests
console.error = (...args) => {
  const message = args[0];
  if (typeof message === 'string') {
    // Suppress Kafka connection errors during tests
    if (message.includes('Connection timeout') || 
        message.includes('Connection error') ||
        message.includes('Failed to connect to seed broker')) {
      return;
    }
  }
  originalConsoleError.apply(console, args);
};

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
