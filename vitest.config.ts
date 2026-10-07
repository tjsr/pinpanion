import { defineConfig } from 'vitest/config';
import { findFileUpwards } from './test/testutils.ts';

const setupPath = findFileUpwards('test/vitest.setup.ts');

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
    environment: 'jsdom',
    globals: true,
    setupFiles: [setupPath],
    testTimeout: (process.env['VITEST_VSCODE'] !== undefined ? 120 : 3) * 1000,
  },
});
