/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

module.exports = {
  root: true,
  extends: '@adobe/helix',
  env: {
    serviceworker: true,
    browser: true,
    es6: true,
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
  },
  overrides: [
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
      ],
      settings: {
        'import/resolver': {
          node: {
            extensions: ['.js', '.ts'],
          },
        },
      },
      rules: {
        // TypeScript handles these
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'no-undef': 'off',
        // TypeScript module resolution
        'import/no-unresolved': 'off',
        'import/extensions': 'off',
        // Allow any in specific cases
        '@typescript-eslint/no-explicit-any': 'warn',
        // Allow empty interfaces for type declarations
        '@typescript-eslint/no-empty-object-type': 'off',
        // Allow assignment to function parameters
        'no-param-reassign': 'off',
        // Allow class methods that don't use 'this'
        'class-methods-use-this': 'off',
      },
    },
    {
      files: ['test/**/*.ts'],
      rules: {
        'import/no-extraneous-dependencies': ['error', {
          devDependencies: true,
          optionalDependencies: false,
          peerDependencies: false,
        }],
      },
    },
  ],
  rules: {
    'import/prefer-default-export': 0,

    // console.log is the only means of logging in a cloudflare worker
    'no-console': 'off',

    // Allow assignment to function parameters
    'no-param-reassign': 'off',

    // Allow class methods that don't use 'this'
    'class-methods-use-this': 'off',

    // Disable license header requirement
    'header/header': 'off',

    // Allow __dirname and __filename
    'no-underscore-dangle': 'off',

    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: true,
      },
    ],
  },
  globals: {
    __rootdir: true,
    __testdir: true,
    globalThis: true,
  },
};
