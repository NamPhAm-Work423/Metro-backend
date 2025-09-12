module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  setupFiles: ['<rootDir>/tests/setup.jest.js'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js', '!src/**/logs/**', '!src/**/node_modules/**'],
  coverageReporters: ['text', 'lcov'],
};
