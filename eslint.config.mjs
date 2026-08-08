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
      // Was a warning while ~29 findings were worked through; at zero, so it gates now.
      'react-hooks/exhaustive-deps': 'error',
      // The rest have been triaged down to a residue that is correct as written: effects
      // that genuinely sequence an async load or reset a dialog on open, a ref latch
      // carried between two effects, and a handful the compiler misreads. They stay as
      // warnings rather than being suppressed one by one to make the count zero - a new
      // one is worth a look, which is what a warning is for.
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      // Reports where React Compiler declined to optimize a component. The build is
      // ts-loader only, with no compiler in it, so there is no optimization being lost
      // and nothing here is ever actionable. Turn it back on if the compiler is adopted.
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/config': 'warn',
      'react-hooks/gating': 'warn',
      // The omit idiom (`const { [id]: _, ...rest } = map`) is what this rule was turned off
      // for; ignoreRestSiblings and the _ pattern cover it, so it can gate again. It earns its
      // keep on handlers that are written but never wired up, which reads as a working feature
      // until someone checks. Was off while ~31 findings were cleared; at zero, so it gates.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'none', ignoreRestSiblings: true, varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
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
