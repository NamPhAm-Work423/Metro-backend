module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    // Core app and platform code under unit/integration tests
    'src/app.js',
    'src/config/**/*.js',
    'src/middlewares/**/*.js',
    'src/routes/**/*.js',
    // Service layers that are unit/integration tested
    'src/services/**/handlers/**/*.js',
    'src/services/**/helpers/**/*.js',
    'src/services/promotion/**/*.js',
    'src/services/transitPass/**/*.js',

    // Exclusions: infra, generated, data-only, heavy impls not targeted by tests
    '!src/index.js',
    '!src/grpc/**',
    '!src/events/**',
    '!src/proto/**',
    '!src/seed/**',
    '!src/logs/**',
    '!src/kafka/**',
    '!src/cron/**',
    '!src/models/**',
    '!src/services/**/interfaces/**',
    '!src/services/**/repositories/**',
    '!src/services/**/domain/**',
    '!src/services/**/calculators/**',
    '!src/services/**/services/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  clearMocks: true,
  restoreMocks: true,
  // Ensure CI does not hang due to stray handles in dependencies
  forceExit: true,
  detectOpenHandles: true,
  // Increase timeout for integration tests
  testTimeout: 30000,
  // Add verbose output for debugging
  verbose: true
}; 