// @ts-check

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import jest from 'eslint-plugin-jest';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ...reactHooks.configs.flat.recommended,
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      // The two classic rules are gates: a violation is either a crash (hooks called
      // after an early return) or a render loop, so neither is allowed to accumulate.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/set-state-in-render': 'error',
      // The remaining React Compiler rules describe real problems but the codebase
      // predates them by ~100 sites, so they ride as warnings and get promoted to
      // 'error' a rule at a time as each is driven to zero. Warnings do not fail
      // `npm run lint`, so the gate above stays meaningful in the meantime.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/config': 'warn',
      'react-hooks/gating': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    files: ['src/**/*.spec.ts'],
    plugins: { jest },
    languageOptions: {
      globals: { ...globals.jest },
      parserOptions: {
        // Spec files are excluded from tsconfig.json (so the webpack build doesn't
        // type-check them), so type-aware linting has to use the jest project instead.
        projectService: false,
        project: './tsconfig.jest.json',
      },
    },
    rules: {
      ...jest.configs['flat/recommended'].rules,
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
    },
  },
  {
    // This is just for node.js scripts in the util/ folder
    files: ['util/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { node: 'readonly' },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
