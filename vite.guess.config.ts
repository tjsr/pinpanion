import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: '/',
  root: path.resolve('guess'),
  publicDir: false,
  plugins: [react()],
  build: {
    outDir: path.resolve('build/guess'),
    emptyOutDir: true,
  },
});
