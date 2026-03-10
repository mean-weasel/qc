/**
 * Multi-User Workflow 10: Milestones Sync
 *
 * Tests that when Alice creates a milestone on the growth page,
 * Bob can see it after navigating to the same page.
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
function uniqueMilestoneTitle(): string {
  return `E2E Milestone ${Date.now()}`
}

/** Alice opens the milestone creator modal and fills out the form */
async function aliceCreatesMilestone(page: Page, title: string): Promise<void> {
  await page.goto('/growth')
  await expect(page.getByRole('heading', { name: /growth gallery/i })).toBeVisible({ timeout: 15000 })

  // Open the New Milestone modal
  await page.getByRole('button', { name: /new milestone/i }).click()
  const modal = page.locator('.fixed.inset-0').filter({ hasText: /create new milestone/i })
  await expect(modal).toBeVisible()

  // Fill title (uses placeholder-based input, not label)
  await modal.getByPlaceholder(/first month of check-ins/i).fill(title)

  // Fill description (min 10 chars required by validation)
  await modal
    .getByPlaceholder(/describe this milestone/i)
    .fill('An E2E test milestone created by Alice for partner sync testing')

  // Select a category (scoped to modal to avoid page-level filter buttons)
  await modal.getByRole('button', { name: /communication/i }).click()

  // Click the Create Milestone button
  await modal.getByRole('button', { name: /^create milestone$/i }).click()

  // Wait for the celebration overlay to appear and auto-dismiss
  await expect(page.getByText('Milestone Created!')).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('Milestone Created!')).not.toBeVisible({ timeout: 10000 })
}

/** Click the first timeline month header to expand it */
async function expandFirstTimelineMonth(page: Page): Promise<void> {
  // Wait for timeline to render, then click the first month group header
  await page.waitForTimeout(500)
  // The month header contains text with "(N milestones)" — use getByText to find it
  const firstMonthHeader = page.getByText(/\d+ milestones?\)/).first()
  await firstMonthHeader.click()
  await page.waitForTimeout(500)
}

/** Verify the milestone appears on Alice's growth page timeline */
async function aliceVerifiesMilestone(page: Page, title: string): Promise<void> {
  // After modal closes, reload to see updated timeline
  await page.reload()
  await expect(page.getByRole('heading', { name: /growth gallery/i })).toBeVisible({ timeout: 15000 })

  // Expand collapsed timeline months if needed
  await expandFirstTimelineMonth(page)

  // Milestone title should appear in the timeline view
  await expect(page.getByText(title)).toBeVisible({ timeout: 15000 })
}

/** Bob navigates to growth and verifies Alice's milestone appears */
async function bobVerifiesMilestone(page: Page, title: string): Promise<void> {
  await page.goto('/growth')
  await expect(page.getByRole('heading', { name: /growth gallery/i })).toBeVisible({ timeout: 15000 })

  // Reload for fresh data (more reliable than real-time in CI)
  await page.reload()
  await expect(page.getByRole('heading', { name: /growth gallery/i })).toBeVisible({ timeout: 15000 })

  // Expand collapsed timeline months if needed
  await expandFirstTimelineMonth(page)

  // Alice's milestone should appear in Bob's timeline
  await expect(page.getByText(title)).toBeVisible({ timeout: 15000 })
}

test.describe('Workflow 10: Milestones Sync', () => {
  test("milestone created by Alice appears on Bob's growth page", async ({ browser }) => {
    const title = uniqueMilestoneTitle()

    // Create independent browser contexts for Alice and Bob
    const alice = await createUserContext(browser)
    const bob = await createUserContext(browser)

    try {
      // Log in both users
      await login(alice.page, ALICE.email, ALICE.password)
      await login(bob.page, BOB.email, BOB.password)

      // Alice creates a milestone
      await aliceCreatesMilestone(alice.page, title)

      // Alice verifies it appears on her growth page
      await aliceVerifiesMilestone(alice.page, title)

      // Bob navigates to growth and sees the milestone
      await bobVerifiesMilestone(bob.page, title)
    } finally {
      await alice.context.close()
      await bob.context.close()
    }
  })
})
