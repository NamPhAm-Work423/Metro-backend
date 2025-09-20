module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  clearMocks: true,
  moduleFileExtensions: ['js', 'json'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/services/**/*.js',
    'src/controllers/**/*.js',
    'src/routes/**/*.js',
    '!src/tracing.js',
    '!src/config/**',
    '!src/grpc/**',
    '!src/kafka/**',
    '!src/events/**',
    '!src/helpers/**',
    '!src/middlewares/**',
    '!src/models/**',
    '!src/proto/**',
    '!src/seed/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: process.env.ENFORCE_COVERAGE === 'true' ? {
    global: {
      lines: 90,
      statements: 90,
      branches: 70,
      functions: 90,
    },
  } : undefined,
  moduleNameMapper: {
    // Prevent DB connection in tests
    '^\.{1,2}/config/database$': '<rootDir>/test/mocks/emptyModule.js',
    '^src/config/database$': '<rootDir>/test/mocks/emptyModule.js',
    // Mock models index to avoid Sequelize
    '^\.{1,2}/models/index\\.model$': '<rootDir>/test/mocks/models.mock.js',
    '^.+/src/models/index\\.model$': '<rootDir>/test/mocks/models.mock.js',
    '^src/models/index\\.model$': '<rootDir>/test/mocks/models.mock.js',
    // Mock kafka producer to silence KafkaJS warnings and external connections
    '^src/kafka/kafkaProducer$': '<rootDir>/test/mocks/kafkaProducer.mock.js',
    // Bypass auth middleware for route tests
    '^\\.{1,2}/middlewares/authorization$': '<rootDir>/test/mocks/authorization.mock.js',
    '^src/middlewares/authorization$': '<rootDir>/test/mocks/authorization.mock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setupEnv.js'],
};


