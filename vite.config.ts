import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import svgr from 'vite-plugin-svgr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: path.resolve(__dirname, "."), // Configura la raíz del proyecto en la carpeta 'client'
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
      },
    }),
  ],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-dev-runtime', 'react/jsx-runtime'], // Vite optimization
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion'],
          firebase: ['firebase/app', 'firebase/analytics', 'firebase/storage'],
          ui: ['lucide-react', '@radix-ui/react-slot', '@radix-ui/react-label', '@radix-ui/react-toast'],
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});