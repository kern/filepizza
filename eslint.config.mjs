// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config({
  extends: [
    eslint.configs.recommended,
    tseslint.configs.recommended,
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-use-before-define': [
      'error',
      { variables: false },
    ],
    '@typescript-eslint/promise-function-async': 'off',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'import/no-unused-modules': 'off',
    'import/group-exports': 'off',
    'import/no-extraneous-dependencies': 'off',
    'new-cap': 'off',
    'no-inline-comments': 'off',
    'no-shadow': 'warn',
    'no-use-before-define': 'off',
  },
  files: ['src/**/*.ts[x]'],
  ignores: ['legacy', 'node_modules', '.next'],
});
