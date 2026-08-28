import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Flat config. Order matters: later entries win.
 *
 * Layering, top to bottom:
 *   1. ignores
 *   2. base JS + type-aware TypeScript rules
 *   3. browser/React layer (hooks, a11y, import hygiene)
 *   4. narrow per-area overrides (tests, tooling, plain JS)
 *   5. eslint-config-prettier last, so formatting rules never fight Prettier
 */
export default tseslint.config(
  {
    // `dist-ssr/` alongside `dist/`: it is the server bundle `npm run prerender`
    // renders from, compiled output like everything else here and no more
    // lintable than the client build.
    ignores: ['dist/**', 'dist-ssr/**', 'coverage/**', 'node_modules/**', '**/*.tsbuildinfo'],
  },

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      ...jsxA11y.flatConfigs.recommended.rules,

      /**
       * `<ul role="list">` is redundant on paper and load-bearing in practice.
       * Safari removes a list's semantics when `list-style: none` is applied —
       * VoiceOver stops announcing it as a list of N items — and restating the
       * role is the standard way to put them back. Every list in this project
       * is unstyled, so the exception is the rule here.
       */
      'jsx-a11y/no-redundant-roles': ['error', { ul: ['list'] }],

      /**
       * Import hygiene only. `import/no-unresolved` and friends are deliberately
       * left off: they would need `eslint-import-resolver-typescript` to understand
       * the `@/` alias, and `tsc` already reports unresolved imports with better
       * diagnostics. This keeps the dependency list — and the lint run — lean.
       */
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/newline-after-import': 'error',
      'import/order': [
        'error',
        {
          // No separate 'type' group: a type-only import belongs next to the
          // module it comes from, not exiled to the bottom of the list.
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal', position: 'before' }],
          pathGroupsExcludedImportTypes: ['builtin', 'external'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // House style: named exports everywhere (the router is the documented exception).
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message:
            'Use named exports. Default exports are only permitted where a framework requires them; add an eslint-disable-next-line with a reason.',
        },
      ],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}', 'scripts/**/*.test.ts'],
    rules: {
      // Test bodies routinely assert on values the type system cannot narrow.
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },

  {
    // The plate builder. Node, not the browser, and it prints to the console
    // for a living.
    files: ['scripts/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
    },
  },

  {
    files: ['vite.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Vite requires a default export from its config module.
      'no-restricted-syntax': 'off',
    },
  },

  {
    // This config file and any other plain JS sit outside every TS program.
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  prettierConfig,
);
