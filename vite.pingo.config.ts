import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: '/',
  root: path.resolve('pingo'),
  publicDir: false,
  plugins: [react()],
  build: {
    // `outDir` is resolved relative to the Pingo root. Keep it relative so
    // Cloudflare never receives a machine-specific Windows path.
    outDir: '../build/pingo',
    emptyOutDir: true,
  },
});
