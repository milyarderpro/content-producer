import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['artifacts/**', 'coverage/**', 'node_modules/**', 'supabase/.branches/**', 'auth-frontend/dist/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['auth-frontend/src/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['auth-frontend/scripts/**/*.mjs', 'auth-frontend/tests/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
);
