module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  clearMocks: true,
  moduleFileExtensions: ['js', 'json'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/services/**/*.js',
    'src/controllers/**/*.js',
    'src/routes/**/*.js',
    '!src/index.js',
    '!src/app.js',
    '!src/config/**',
    '!src/models/index.model.js',
    '!src/events/**',
    '!src/swagger/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      lines: 90,
      statements: 90,
      branches: 80,
      functions: 90,
    },
  },
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  moduleNameMapper: {
    '^./config/database$': '<rootDir>/tests/mocks/emptyModule.js',
    '^../config/database$': '<rootDir>/tests/mocks/emptyModule.js',
    '^src/config/database$': '<rootDir>/tests/mocks/emptyModule.js',
    '^../config/redis$': '<rootDir>/tests/mocks/emptyModule.js',
    '^./config/redis$': '<rootDir>/tests/mocks/emptyModule.js',
    '^src/config/redis$': '<rootDir>/tests/mocks/emptyModule.js',
    // Map models index to mock for both relative and absolute imports
    '^\.{1,2}/models/index\.model$': '<rootDir>/tests/mocks/models.mock.js',
    '^.+/src/models/index\.model$': '<rootDir>/tests/mocks/models.mock.js',
    '^src/models/index\.model$': '<rootDir>/tests/mocks/models.mock.js',
  },
};