module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  clearMocks: true,
  moduleFileExtensions: ['js', 'json'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/app.js',
    '!src/config/database.js',
    // Exclude configuration and adapter files that are hard to unit test and
    // provide minimal value to coverage metrics
    '!src/config/logger.js',
    '!src/config/paypal.js',
    '!src/kafka/**/*.js',
    '!src/events/**/*.js',
    '!src/controllers/**/*.js',
    '!src/routes/**/*.js',
    '!src/middlewares/**/*.js',
    '!src/helpers/**/*.js',
    // Exclude third-party API wrapper with extensive side-effects and I/O
    '!src/services/paypal.service.js',
    // Exclude interface-only file
    '!src/strategies/payment/IPaymentStrategy.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: process.env.ENFORCE_COVERAGE === 'true' ? {
    global: {
      lines: 80,
      statements: 80,
      branches: 70,
      functions: 80,
    },
  } : undefined,
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  moduleNameMapper: {
    // Prevent DB connection in tests
    '^\\.{1,2}/config/database$': '<rootDir>/test/mocks/emptyModule.js',
    '^src/config/database$': '<rootDir>/test/mocks/emptyModule.js',
    // Mock models index to avoid Sequelize - catch all possible import patterns
    '^\\.{1,2}/models/index\\.model$': '<rootDir>/test/mocks/models.mock.js',
    '^\\.{1,2}/models/index\\.model\\.js$': '<rootDir>/test/mocks/models.mock.js',
    '^.+/src/models/index\\.model$': '<rootDir>/test/mocks/models.mock.js',
    '^.+/src/models/index\\.model\\.js$': '<rootDir>/test/mocks/models.mock.js',
    '^src/models/index\\.model$': '<rootDir>/test/mocks/models.mock.js',
    '^src/models/index\\.model\\.js$': '<rootDir>/test/mocks/models.mock.js',
    // Catch any models directory import - this should catch the ../../models/index.model pattern
    '^\\.{1,2}/models/.*$': '<rootDir>/test/mocks/models.mock.js',
    // More specific patterns for relative imports
    '^\\.\\./models/index\\.model$': '<rootDir>/test/mocks/models.mock.js',
    '^\\.\\./\\.\\./models/index\\.model$': '<rootDir>/test/mocks/models.mock.js',
  },
};


