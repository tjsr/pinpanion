import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: '/',
  root: path.resolve('pingo'),
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: path.resolve('build/pingo'),
    emptyOutDir: true,
  },
});
