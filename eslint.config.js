import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        FileReader: 'readonly',
        File: 'readonly',
        FileList: 'readonly',
        Worker: 'readonly',
        MessageEvent: 'readonly',
        Event: 'readonly',
        EventListener: 'readonly',
        CustomEvent: 'readonly',
        URL: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        performance: 'readonly',
        self: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Bun: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        confirm: 'readonly',
        crypto: 'readonly',
        IDBDatabase: 'readonly',
        indexedDB: 'readonly',
        IDBOpenDBRequest: 'readonly',
        IDBRequest: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
    },
  },
  prettier,
  {
    ignores: ['dist', 'node_modules', 'coverage', '*.config.js', 'scripts'],
  },
];
