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
    '!src/services/scheduler.service.js',
    '!src/services/qr.service.js',
    '!src/kafka/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 60,
      functions: 75,
      lines: 75
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  clearMocks: true,
  restoreMocks: true,
  forceExit: true,
  detectOpenHandles: true
};


