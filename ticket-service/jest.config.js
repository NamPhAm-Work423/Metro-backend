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
  testTimeout: 30000,
  // Add verbose output for debugging
  verbose: true,
  coverageThreshold: {
    global: { statements: 85, branches: 75, functions: 85, lines: 85 },
  },
}; 