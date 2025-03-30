import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: './client', // Configura la raíz del proyecto en la carpeta 'client'
  plugins: [react()],
  server: {
    host: 'localhost',  // Change to '0.0.0.0' if remote access is needed
    port: 5173,         // Set your preferred port (default: 5173)
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-dev-runtime', 'react/jsx-runtime'], // Vite optimization
  },
  build: {
    outDir: 'dist', // Directory for production build output
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
});
