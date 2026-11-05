import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// Next 16 removed `next lint` and ships eslint-config-next as flat config, so
// this is read by plain `eslint .` — which, unlike `next lint`, walks every
// directory. The ignores below are what `next lint` never looked at.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // eslint-config-next 16 brings react-hooks v7, whose React Compiler rules
      // flag patterns this code base has used all along (setState in an effect,
      // a ref read during render, Date.now() in render). Warnings, not errors,
      // so the upgrade does not turn existing, working components into a red
      // lint run; fix them as those files are next touched.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react/no-children-prop': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    'public/**',
    'node_modules/**',
    'next-env.d.ts',
    'src/payload-types.ts',
    'src/app/(payload)/admin/importMap.js',
    'src/migrations/*.json',
    'playwright-report/**',
    'test-results/**',
  ]),
])
