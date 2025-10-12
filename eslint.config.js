const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.jest
      }
    }
  },
  js.configs.recommended,
  {
    rules: {
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'no-console': 'off',
      'no-undef': 'error'
    }
  },
  {
    ignores: [
      'node_modules/',
      'coverage/'
    ]
  }
];