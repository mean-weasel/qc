/**
 * Multi-User Workflow 11: Reminders Sync
 *
 * Tests that when Alice creates a reminder, Bob can see it
 * on the reminders page after navigating there.
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
function uniqueReminderTitle(): string {
  return `E2E Reminder ${Date.now()}`
}

/** Generate a future datetime string for the scheduled_for input */
function futureDateTime(): string {
  const future = new Date()
  future.setDate(future.getDate() + 7)
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  return future.toISOString().slice(0, 16)
}

/** Alice opens the reminder form and creates a new reminder */
async function aliceCreatesReminder(page: Page, title: string): Promise<void> {
  await page.goto('/reminders')
  await expect(page.getByRole('heading', { name: /^reminders$/i })).toBeVisible({ timeout: 15000 })

  // Click New Reminder to reveal the form
  await page.getByRole('button', { name: /new reminder/i }).click()
  await expect(page.getByRole('heading', { name: /new reminder/i })).toBeVisible()

  // Fill title (use .first() since the heading also contains "title"-like text)
  await page.getByLabel(/title/i).first().fill(title)

  // Fill message
  await page.getByLabel(/message/i).fill('An E2E test reminder from Alice')

  // Fill scheduled_for with a future date (required field)
  await page.getByLabel(/scheduled for/i).fill(futureDateTime())

  // Submit the form
  await page.getByRole('button', { name: /create reminder/i }).click()

  // Form should collapse after successful creation
  await expect(page.getByRole('heading', { name: /new reminder/i })).not.toBeVisible({ timeout: 10000 })
}

/** Verify the reminder appears in Alice's reminder list */
async function aliceVerifiesReminder(page: Page, title: string): Promise<void> {
  await expect(page.getByRole('heading', { name: title }).first()).toBeVisible({ timeout: 15000 })
}

/** Bob navigates to reminders and verifies Alice's reminder is visible */
async function bobVerifiesReminder(page: Page, title: string): Promise<void> {
  await page.goto('/reminders')
  await expect(page.getByRole('heading', { name: /^reminders$/i })).toBeVisible({ timeout: 15000 })

  // Reload for fresh data (more reliable than real-time in CI)
  await page.reload()
  await expect(page.getByRole('heading', { name: /^reminders$/i })).toBeVisible({ timeout: 15000 })

  // Alice's reminder should appear in Bob's list
  await expect(page.getByRole('heading', { name: title }).first()).toBeVisible({ timeout: 15000 })
}

test.describe('Workflow 11: Reminders Sync', () => {
  test("reminder created by Alice appears on Bob's reminders page", async ({ browser }) => {
    const title = uniqueReminderTitle()

    // Create independent browser contexts for Alice and Bob
    const alice = await createUserContext(browser)
    const bob = await createUserContext(browser)

    try {
      // Log in both users
      await login(alice.page, ALICE.email, ALICE.password)
      await login(bob.page, BOB.email, BOB.password)

      // Alice creates a reminder
      await aliceCreatesReminder(alice.page, title)

      // Alice verifies it appears in her reminder list
      await aliceVerifiesReminder(alice.page, title)

      // Bob navigates to reminders and sees it
      await bobVerifiesReminder(bob.page, title)
    } finally {
      await alice.context.close()
      await bob.context.close()
    }
  })
})
