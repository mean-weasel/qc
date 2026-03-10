/**
 * Multi-User Workflow 08: Love Languages Sharing
 *
 * Tests that when Partner A adds a love language with shared visibility,
 * Partner B can see it on the Partner's tab.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const ALICE = { email: 'alice@test.com', password: 'password123' }
const BOB = { email: 'bob@test.com', password: 'password123' }

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
}

/** Create an independent browser context with its own session */
async function createUserContext(browser: { newContext: () => Promise<BrowserContext> }): Promise<{
  context: BrowserContext
  page: Page
}> {
  const context = await browser.newContext()
  const page = await context.newPage()
  return { context, page }
}

/** Unique title to avoid collisions with seed data */
function uniqueTitle(): string {
  return `E2E Shared Lang ${Date.now()}`
}

/** Alice creates a shared love language via the Add Language dialog */
async function aliceCreatesSharedLanguage(page: Page, title: string): Promise<void> {
  await page.goto('/love-languages')
  await expect(page.getByRole('heading', { level: 1, name: /love languages/i })).toBeVisible({ timeout: 15000 })

  // Open the Add Language dialog
  await page.getByRole('button', { name: /add language/i }).click()
  await expect(page.getByRole('heading', { name: /add love language/i })).toBeVisible()

  // Fill title
  await page.getByLabel(/title/i).fill(title)

  // Fill description
  await page.getByLabel(/description/i).fill('A test love language created by Alice for E2E')

  // Select "Shared with partner" privacy radio
  await page.getByText('Shared with partner', { exact: true }).click()

  // Submit the form
  await page.getByRole('button', { name: /add love language/i }).click()

  // Dialog should close
  await expect(page.getByRole('heading', { name: /add love language/i })).not.toBeVisible({ timeout: 10000 })
}

/** Verify the language appears in Alice's My Languages tab */
async function aliceVerifiesLanguage(page: Page, title: string): Promise<void> {
  // Should already be on the "My Languages" tab (default)
  await expect(page.getByText(title)).toBeVisible({ timeout: 15000 })
}

/** Bob navigates to Partner's tab and verifies Alice's shared language */
async function bobVerifiesPartnerLanguage(page: Page, title: string): Promise<void> {
  await page.goto('/love-languages')
  await expect(page.getByRole('heading', { level: 1, name: /love languages/i })).toBeVisible({ timeout: 15000 })

  // Switch to Partner's tab
  await page.getByRole('tab', { name: /partner/i }).click()

  // Reload to ensure fresh data (more reliable than real-time in CI)
  await page.reload()
  await page.getByRole('tab', { name: /partner/i }).click()

  // Verify Alice's shared language appears
  await expect(page.getByText(title)).toBeVisible({ timeout: 15000 })
}

test.describe('Workflow 08: Love Languages Sharing', () => {
  test("shared love language created by Alice appears on Bob's Partner tab", async ({ browser }) => {
    const title = uniqueTitle()

    // Create independent browser contexts for Alice and Bob
    const alice = await createUserContext(browser)
    const bob = await createUserContext(browser)

    try {
      // Log in both users
      await login(alice.page, ALICE.email, ALICE.password)
      await login(bob.page, BOB.email, BOB.password)

      // Alice creates a shared love language
      await aliceCreatesSharedLanguage(alice.page, title)

      // Alice verifies it appears in her list
      await aliceVerifiesLanguage(alice.page, title)

      // Bob navigates to Partner's tab and sees Alice's language
      await bobVerifiesPartnerLanguage(bob.page, title)
    } finally {
      await alice.context.close()
      await bob.context.close()
    }
  })
})
