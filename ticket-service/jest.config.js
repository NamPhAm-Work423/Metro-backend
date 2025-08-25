module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    // Ignore infrastructure and generated/IDL files
    '!src/grpc/**',
    '!src/events/**',
    '!src/proto/**',
    '!src/seed/**',
    '!src/logs/**',
    // Ignore pure data models and interface contracts (covered via integration)
    '!src/models/**',
    '!src/services/**/interfaces/**',
    // Allow focusing on unit-testable service logic; repositories may require DB
    '!src/services/**/repositories/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  clearMocks: true,
  restoreMocks: true,
  // Ensure CI does not hang due to stray handles in dependencies
  forceExit: true,
  detectOpenHandles: true
}; 