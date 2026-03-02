import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          worker: ['./src/worker/stats.worker.ts']
        }
      }
    }
  },
  worker: {
    format: 'es'
  },
  server: {
    port: 6768
  }
});
