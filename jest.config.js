module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.test.js'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
    moduleDirectories: ['node_modules', 'src'],
    testTimeout: 10000,
    clearMocks: true,
    restoreMocks: true,
    coverageThreshold: {
      global: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  };