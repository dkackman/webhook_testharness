/**
 * ESLint flat config for Node.js + Browser project
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 */

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
    },
    rules: {
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_|next', varsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    // Browser-specific config for client-side JS
    files: ['public/javascripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jquery,
        WebhookApp: 'writable',
      },
    },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^(_|WebhookApp$)',
      }],
    },
  },
  {
    ignores: ['node_modules/**'],
  },
];
