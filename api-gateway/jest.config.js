module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  setupFiles: ['<rootDir>/tests/testSetup.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    // Focus coverage on unit-testable modules
    'src/controllers/**/*.js',
    'src/helpers/**/*.js',
    'src/utils/**/*.js',
    'src/routes/**/*.js',
    // Always exclude bootstrap/infrastructure
    '!src/index.js',
    '!src/app.js',
    '!src/initialize.js',
    '!src/config/**',
    '!src/events/**',
    '!src/kafka/**',
    '!src/logs/**',
    '!src/proto/**',
    '!src/swagger/**',
    '!src/seed/**',
    '!src/models/**',
    '!src/middlewares/**',
    '!src/services/**'
  ],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/index.js',
    '<rootDir>/src/app.js',
    '<rootDir>/src/initialize.js',
    '<rootDir>/src/config/',
    '<rootDir>/src/events/',
    '<rootDir>/src/kafka/',
    '<rootDir>/src/logs/',
    '<rootDir>/src/proto/',
    '<rootDir>/src/swagger/',
    '<rootDir>/src/seed/',
    '<rootDir>/src/models/'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: process.env.ENFORCE_COVERAGE === 'true'
    ? {
        global: {
          lines: 80,
          statements: 80,
          branches: 55,
          functions: 65
        }
      }
    : undefined,
  moduleNameMapper: {
    '^../config/logger$': '<rootDir>/tests/__mocks__/logger.js',
    '^../../config/logger$': '<rootDir>/tests/__mocks__/logger.js',
    '^../../../config/logger$': '<rootDir>/tests/__mocks__/logger.js'
  },
  modulePathIgnorePatterns: [
    '<rootDir>/tests/unit/redis.bak'
  ],
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
}; 