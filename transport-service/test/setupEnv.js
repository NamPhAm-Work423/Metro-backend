process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
// Silence noisy error/warn logs during tests
/* eslint-disable no-console */
if (!console._patchedForTests) {
  console._patchedForTests = true;
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = jest.fn((...args) => {
    // Allow explicit test debugging by setting env
    if (process.env.SHOW_TEST_ERRORS === '1') {
      originalError.apply(console, args);
    }
  });
  console.warn = jest.fn((...args) => {
    if (process.env.SHOW_TEST_WARNINGS === '1') {
      originalWarn.apply(console, args);
    }
  });
}


