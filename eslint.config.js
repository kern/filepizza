'use strict';

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: './tsconfig.json',
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@next/next/recommended"
  ],
  plugins: [
    "@typescript-eslint",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-use-before-define": ["error", { "variables": false }],
    "@typescript-eslint/promise-function-async": "off",
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "import/no-unused-modules": "off",
    "import/group-exports": "off",
    "import/no-extraneous-dependencies": "off",
    "new-cap": "off",
    "no-inline-comments": "off",
    "no-shadow": "warn",
    "no-use-before-define": "off",
  }
};
