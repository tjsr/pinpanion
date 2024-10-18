import { defineConfig } from 'vitest/config';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.join(process.env.PROJECT_ROOT || process.cwd(), 'test/vitest.setup.ts')],
    testTimeout: (process.env['VITEST_VSCODE'] !== undefined ? 120 : 3) * 1000,
  },
});
