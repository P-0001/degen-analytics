import { defineConfig } from 'vite';
import packageJson from './package.json';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
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
