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
    'src/controllers/**/*.js',
    // Service layers that are unit/integration tested
    'src/services/**/handlers/**/*.js',
    'src/services/**/helpers/**/*.js',
    'src/services/promotion/**/*.js',
    'src/services/transitPass/**/*.js',
    'src/services/fare/**/*.js',
    'src/services/ticket/**/*.js',

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
    '!src/config/**',
    '!src/app.js',
    '!src/services/ticket/index.js',
    // Exclude interface declaration files from coverage to avoid skewing metrics
    '!src/services/**/interfaces/*.js',
    // Exclude repositories and heavy orchestrator services from coverage
    '!src/services/**/repositories/**',
    '!src/services/ticket/services/TicketService.js',
    // Exclude passengerIdTracing from coverage (fully mocked for integration tests)
    '!src/services/ticket/handlers/passengerIdTracing.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  setupFiles: ['<rootDir>/tests/setup/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  clearMocks: true,
  restoreMocks: true,
  // Ensure CI does not hang due to stray handles in dependencies
  forceExit: true,
  detectOpenHandles: true,
  // Increase timeout for integration tests
  testTimeout: 10000,
  // Add verbose output for debugging
  verbose: true,
  // Prevent Jest from hanging on async operations
  maxWorkers: 1,
  coverageThreshold: {
    global: { statements: 80, branches: 65, functions: 85, lines: 80 },
  },
}; 