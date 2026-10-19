import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    // Keep fonts and other assets as separate files so a strict CSP never
    // needs to allow data: fonts.
    assetsInlineLimit: 0,
  },
  server: {
    // Express owns the port; Vite runs in middleware mode.
    host: '127.0.0.1',
  },
});
