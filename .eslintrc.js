'use strict';

module.exports = {
  extends: [
    '@strv/typescript',
    '@strv/typescript/optional',
    '@strv/typescript/style'
  ],
  plugins: [
    "prettier"
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-use-before-define": ["error", { "variables": false }],
    "@typescript-eslint/no-parameter-properties": ["error", { "allows": ["private readonly"] }],
    "@typescript-eslint/promise-function-async": "off",
    "@typescript-eslint/require-await": "off",
    "import/no-unused-modules": "off",
    "import/group-exports": "off",
    "import/no-extraneous-dependencies": "off",
    "new-cap": "off",
    "no-inline-comments": "off",
    "no-shadow": "warn",
    "no-use-before-define": ["error", { "variables": false }],
    "prettier/prettier": "error",
  }
};
