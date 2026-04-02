import type { Plugin } from 'vite';
import { basename } from 'path';

interface MinifyOptions {
  removeComments?: boolean;
  collapseWhitespace?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function sizeDiff(original: string, minified: string): string {
  const originalSize = original.length;
  const minifiedSize = minified.length;
  const saved = originalSize - minifiedSize;
  const percentage = (saved / originalSize) * 100;
  return `[${formatBytes(originalSize)} -> ${formatBytes(minifiedSize)}] ${formatBytes(saved)} (${percentage.toFixed(2)}%)`;
}

function minifyHBS(content: string, options: MinifyOptions = {}): string {
  const { removeComments = true, collapseWhitespace = true } = options;

  let minified = content;

  if (removeComments) {
    minified = minified.replace(/<!--[\s\S]*?-->/g, '');
    minified = minified.replace(/{{!--[\s\S]*?--}}/g, '');
    minified = minified.replace(/{{![\s\S]*?}}/g, '');
  }

  if (collapseWhitespace) {
    minified = minified.replace(/>\s+</g, '><');
    minified = minified.replace(/\s{2,}/g, ' ');
    minified = minified.replace(/^\s+|\s+$/gm, '');
    minified = minified.trim();
  }

  return minified;
}

export function minifyHBSPlugin(options: MinifyOptions = {}): Plugin {
  return {
    name: 'vite-plugin-minify-hbs',
    enforce: 'pre',
    async transform(code: string, id: string) {
      if (id.endsWith('.hbs?raw')) {
        const minified = minifyHBS(code, options);
        //const savedMsg = sizeDiff(code, minified);
        // console.log(`\n[vite-plugin-minify-hbs] Minified ${basename(id, '.hbs?raw')}: ${savedMsg}`);
        return {
          code: minified,
          map: null,
        };
      }
      return null;
    },
  };
}
