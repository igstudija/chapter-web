import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

/**
 * Browser tests run against an installed site — a migrated database with an
 * administrator on it. They are not part of `pnpm test`, which has to pass on a
 * fresh clone with neither. Run them with `pnpm test:e2e`.
 */

/** The port `pnpm dev` listens on. The two drifting apart is what broke this before. */
const PORT = process.env.PORT || '3050'
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'list' : 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    /**
     * Never reuse a server in CI. Attaching to whatever already happens to hold
     * the port would let the suite pass against a build that is not the one
     * under test — a green run that proves nothing. Locally, reuse is a
     * convenience worth keeping.
     */
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
