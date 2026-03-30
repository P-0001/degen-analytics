import { defineConfig } from 'vite';
import packageJson from './package.json';
import { minifyHBSPlugin } from './scripts/vite-plugin-minify-hbs';

export default defineConfig({
  plugins: [minifyHBSPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-charts': ['chart.js'],
          'vendor-templates': ['handlebars']
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
