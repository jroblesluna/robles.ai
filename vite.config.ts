import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: path.resolve(__dirname, "."), // Configura la raíz del proyecto en la carpeta 'client'
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-dev-runtime', 'react/jsx-runtime'], // Vite optimization
  },
  build: {
    outDir: 'dist', // Explicit output directory
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});