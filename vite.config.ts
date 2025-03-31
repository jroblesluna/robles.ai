import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("__dirname", __dirname);

export default defineConfig({
  root: path.resolve(__dirname, "client"), // Configura la raíz del proyecto en la carpeta 'client'
  plugins: [react()],
  server: {
    host: 'localhost',  // Change to '0.0.0.0' if remote access is needed
    port: 5173,         // Set your preferred port (default: 5173)
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-dev-runtime', 'react/jsx-runtime'], // Vite optimization
  },
  build: {
    outDir: '../dist/client', // Explicit output directory
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
});
console.log("@: path.resolve(__dirname, client, src)",path.resolve(__dirname, "client", "src"))
console.log("@shared: path.resolve(__dirname, shared)",path.resolve(__dirname, "shared"))
console.log("@assets: path.resolve(__dirname, attached_assets)",path.resolve(__dirname, "attached_assets"))