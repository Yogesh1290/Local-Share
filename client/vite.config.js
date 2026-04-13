import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api':      { target: 'http://localhost:8080', changeOrigin: true },
      '/upload':   { target: 'http://localhost:8080', changeOrigin: true },
      '/download': { target: 'http://localhost:8080', changeOrigin: true },
      '/qr':       { target: 'http://localhost:8080', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
});
