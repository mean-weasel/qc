/**
 * Multi-User Workflow 09: Love Actions Sync
 *
 * Tests that when Alice creates a love action, Bob can see it
 * on the love actions page after reload.
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
function uniqueActionTitle(): string {
  return `E2E Action ${Date.now()}`
}

/** Alice navigates to love actions and creates a new action */
async function aliceCreatesAction(page: Page, title: string): Promise<void> {
  await page.goto('/love-languages/actions')
  await expect(page.getByRole('heading', { name: /love actions/i })).toBeVisible({ timeout: 15000 })

  // Open the Add Action dialog
  await page.getByRole('button', { name: /add action/i }).click()
  await expect(page.getByRole('heading', { name: /add love action/i })).toBeVisible()

  // Fill action title
  await page.getByLabel(/action title/i).fill(title)

  // Fill description
  await page.getByLabel(/description/i).fill('An E2E test action created by Alice')

  // Submit the form (button text is "Add Action" for new actions)
  await page.getByRole('button', { name: /^add action$/i }).click()

  // Dialog should close
  await expect(page.getByRole('heading', { name: /add love action/i })).not.toBeVisible({ timeout: 10000 })
}

/** Verify the action appears in Alice's Pending tab */
async function aliceVerifiesAction(page: Page, title: string): Promise<void> {
  // Pending tab is the default tab
  await expect(page.getByText(title)).toBeVisible({ timeout: 15000 })
}

/** Bob navigates to love actions and verifies Alice's action is visible */
async function bobVerifiesAction(page: Page, title: string): Promise<void> {
  await page.goto('/love-languages/actions')
  await expect(page.getByRole('heading', { name: /love actions/i })).toBeVisible({ timeout: 15000 })

  // Reload for fresh data (more reliable than real-time in CI)
  await page.reload()
  await expect(page.getByRole('heading', { name: /love actions/i })).toBeVisible({ timeout: 15000 })

  // Alice's action should be visible in the Pending tab (default)
  await expect(page.getByText(title)).toBeVisible({ timeout: 15000 })
}

test.describe('Workflow 09: Love Actions Sync', () => {
  test('love action created by Alice is visible to Bob', async ({ browser }) => {
    const title = uniqueActionTitle()

    // Create independent browser contexts for Alice and Bob
    const alice = await createUserContext(browser)
    const bob = await createUserContext(browser)

    try {
      // Log in both users
      await login(alice.page, ALICE.email, ALICE.password)
      await login(bob.page, BOB.email, BOB.password)

      // Alice creates a love action
      await aliceCreatesAction(alice.page, title)

      // Alice verifies it appears in her Pending tab
      await aliceVerifiesAction(alice.page, title)

      // Bob navigates to love actions and verifies it appears
      await bobVerifiesAction(bob.page, title)
    } finally {
      await alice.context.close()
      await bob.context.close()
    }
  })
})
