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
    '!src/app.js',
    '!src/config/**',
    '!src/grpc/**',
    '!src/proto/**',
    '!src/controllers/**',
    '!src/middlewares/**',
    '!src/routes/**',
    '!src/services/cache.service.js',
    '!src/services/transport.service.js',
    '!src/services/scheduler.service.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  clearMocks: true,
  restoreMocks: true,
  forceExit: true,
  detectOpenHandles: true
};


