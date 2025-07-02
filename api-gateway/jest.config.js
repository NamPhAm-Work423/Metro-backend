module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  setupFiles: ['<rootDir>/tests/testSetup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/config/database.js',
    '!src/initialize.js'
  ],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  moduleNameMapper: {
    '^../config/logger$': '<rootDir>/tests/__mocks__/logger.js',
    '^../../config/logger$': '<rootDir>/tests/__mocks__/logger.js',
    '^../../../config/logger$': '<rootDir>/tests/__mocks__/logger.js'
  },
  modulePathIgnorePatterns: [
    '<rootDir>/tests/unit/redis.bak'
  ],
  testEnvironment: 'node',
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
}; 