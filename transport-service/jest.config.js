module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  clearMocks: true,
  moduleFileExtensions: ['js', 'json'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/services/**/*.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: process.env.ENFORCE_COVERAGE === 'true' ? {
    global: {
      lines: 90,
      statements: 90,
      branches: 80,
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
    // Bypass auth middleware for route tests
    '^\\.{1,2}/middlewares/authorization$': '<rootDir>/test/mocks/authorization.mock.js',
    '^src/middlewares/authorization$': '<rootDir>/test/mocks/authorization.mock.js',
  },
};


