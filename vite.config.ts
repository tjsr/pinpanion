import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';
import { findFileUpwards } from './test/testutils.ts';
import react from '@vitejs/plugin-react';

const setupPath = findFileUpwards('test/vitest.setup.ts');

export default defineConfig({
  build: {
    outDir: 'build',
  },
  plugins: [react(), cloudflare()],
  server: {
    watch: {
      usePolling: true,
    },
  },
  test: {
    globals: true,
    projects: ['./test'],
    setupFiles: [setupPath],
    testTimeout: (process.env['VITEST_VSCODE'] !== undefined ? 120 : 3) * 1000,
  },
});
