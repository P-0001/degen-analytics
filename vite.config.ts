import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'terser'
  },
  worker: {
    format: 'es'
  },
  server: {
    port: 6768
  }
});
