// Mock for tracing module to prevent test failures
const mockSpan = {
  setAttributes: jest.fn(),
  setStatus: jest.fn(),
  recordException: jest.fn(),
  end: jest.fn(),
};

const mockTracer = {
  startActiveSpan: jest.fn().mockImplementation((name, fn) => {
    return fn(mockSpan);
  }),
};

const mockTrace = {
  getTracer: jest.fn().mockReturnValue(mockTracer),
};

// Mock addCustomSpan function
const addCustomSpan = jest.fn().mockImplementation(async (name, fn) => {
  return await fn(mockSpan);
});

// Mock createCustomSpan function (alias)
const createCustomSpan = addCustomSpan;

// Mock SDK
const mockSDK = {
  start: jest.fn().mockResolvedValue(),
  shutdown: jest.fn().mockResolvedValue(),
};

module.exports = {
  addCustomSpan,
  createCustomSpan,
  sdk: mockSDK,
  trace: mockTrace,
  SpanStatusCode: {
    OK: 1,
    ERROR: 2,
  },
};
