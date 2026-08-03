import { test, expect } from '@playwright/test'

/**
 * Proof that an install produced a working site.
 *
 * Deliberately thin. Its job is to answer "did the install work?", not to test
 * features — feature coverage belongs in tests that do not pay for a database.
 * It runs against a site that has been migrated and bootstrapped, which in CI
 * is the install-path job and locally is whatever `pnpm bootstrap` created.
 */

/** The name the install was bootstrapped with. */
const ORGANISATION = process.env.SETUP_ORG_NAME || 'Verification Chapter'

test.describe('a freshly installed site', () => {
  test('serves a home page carrying the organisation name', async ({ page }) => {
    const response = await page.goto('/')

    expect(response?.status()).toBe(200)

    // The name is the evidence that this is *their* install rather than a
    // template: it can only be here because bootstrap wrote it.
    await expect(page.locator('body')).toContainText(ORGANISATION)
  })

  test('renders the admin panel login for a signed-out visitor', async ({ page }) => {
    await page.goto('/admin')

    // Payload sends anyone without a session to its login screen. Landing
    // anywhere else means the admin panel did not come up.
    await page.waitForURL(/\/admin\/login/, { timeout: 30_000 })

    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})
