import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use /blep/ when deploying to GitHub Pages; root path when running in Docker
const base = process.env.VITE_DOCKER === '1' ? '/' : '/blep/';

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
});

