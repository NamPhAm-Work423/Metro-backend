module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  clearMocks: true,
  moduleFileExtensions: ['js', 'json'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/services/**/*.js',
    '!src/services/templates/**/*',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      lines: 80,
      statements: 80,
      branches: 70,
      functions: 80,
    },
  },
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  moduleNameMapper: {
    '^../config/database$': '<rootDir>/tests/mocks/emptyModule.js',
    '^../../src/config/database$': '<rootDir>/tests/mocks/emptyModule.js',
    '^src/config/database$': '<rootDir>/tests/mocks/emptyModule.js',
  },
};


