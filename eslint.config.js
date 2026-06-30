const typescriptParser = require('@typescript-eslint/parser');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');
const reactPlugin = require('eslint-plugin-react');
const reactNativePlugin = require('eslint-plugin-react-native');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  // 1. Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/build/**',
      '**/dist/**',
      '**/.bundle/**',
      '**/android/**',
      '**/ios/**',
      '**/coverage/**',
      '**/babel.config.js',
      '**/metro.config.js',
      '**/jest.config.js',
    ],
  },

  // 2. TypeScript + React/RN rules for ts/tsx files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      react: reactPlugin,
      'react-native': reactNativePlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // TypeScript recommended rules
      ...typescriptPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // React recommended rules
      ...reactPlugin.configs.recommended.rules,
      // React Native rules
      // 设计 Token 规范 — 硬性拦截（Phase A）
      'react-native/no-color-literals': 'error',
      'react-native/no-inline-styles': 'error',
      'react-native/no-unused-styles': 'warn',
      'react-native/split-platform-components': 'warn',
      // Overrides for TypeScript + React Native
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },

  // 3. Prettier (must be last to override conflicting rules)
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': [
        'error',
        {
          arrowParens: 'avoid',
          singleQuote: true,
          trailingComma: 'all',
          semi: true,
          printWidth: 100,
          tabWidth: 2,
        },
      ],
    },
  },
];
