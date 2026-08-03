import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * The tests that need a database.
 *
 * Kept apart from `vitest.config.mts` so that `pnpm test` can pass on a fresh
 * clone, where no database exists yet. The `.db.spec.ts` suffix is the contract:
 * a file carrying it may open a connection, and a file under `.int.spec.ts` may
 * not.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    // These tests build the real Payload config, which reads its connection
    // string and storage settings from the environment.
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.db.spec.ts'],
  },
})
