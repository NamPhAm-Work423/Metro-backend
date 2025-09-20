// Mock logger for Jest tests
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  traceInfo: jest.fn(),
  traceError: jest.fn()
};

const mockRequestLogger = jest.fn((req, res, next) => next());

module.exports = {
  logger: mockLogger,
  requestLogger: mockRequestLogger
}; 