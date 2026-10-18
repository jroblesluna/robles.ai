import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  test: {
    globals: true,
    // postbuild copies source files; generated mirrors are not independent tests.
    exclude: [...configDefaults.exclude, 'dist/**'],
    environment: 'jsdom',
    environmentMatchGlobs: [
      ['server/**/*.test.ts', 'node'],
    ],
    setupFiles: ['./src/test/setup.ts'],
  },
});
