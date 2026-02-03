import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './src/manifest';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
      },
    },
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    cors: true,
    headers: {
      // Allow loading dev assets (/@vite/env, /@crx/*) from chrome-extension://<id>
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
      // Some Chrome contexts enforce CORP for cross-origin script/module loads
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
    hmr: {
      host: 'localhost',
      port: 5173,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
});
