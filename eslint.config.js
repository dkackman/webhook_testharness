/**
 * ESLint flat config for Node.js ES Modules + Browser project
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 */

import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    // Browser-specific config for client-side JS (remains CommonJS/script)
    files: ['public/javascripts/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.jquery,
        WebhookApp: 'writable',
        bootstrap: 'readonly',
        // Global utilities (loaded via layout.pug script tags)
        AppConfig: 'readonly',
        logger: 'readonly',
        createStateManager: 'readonly',
        createDefaultStateConfig: 'readonly',
        createPageModule: 'readonly',
        renderJsonWithSyntax: 'readonly',
        buildUrl: 'readonly',
        fetchWithRetry: 'readonly',
        fetchWithCache: 'readonly',
        validateTransactionId: 'readonly',
        validateCoinIds: 'readonly',
        validateAssetIds: 'readonly',
        validateLauncherIds: 'readonly',
        EventStore: 'readonly',
        SSEManager: 'readonly',
        initSseStatusBadge: 'readonly',
        createFetchErrorHandler: 'readonly',
        createFormSubmitHandler: 'readonly',
        autoLoadFromUrl: 'readonly',
        updateUrlParam: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(_|WebhookApp$)',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-redeclare': ['error', { builtinGlobals: false }],
    },
  },
  {
    // Test files (Mocha + Chai)
    files: ['test/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
  },
  {
    ignores: ['node_modules/**'],
  },
  // Prettier must be last to override other configs
  prettier,
];
