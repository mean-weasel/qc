/**
 * Multi-User Workflow 07: Session Settings Proposal
 *
 * Tests that Partner A (Alice) changes session settings and Partner B (Bob)
 * sees the update (or proposal banner) on the Session Rules tab.
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

async function createContextAndPage(browser: {
  newContext: () => Promise<BrowserContext>
}): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext()
  const page = await context.newPage()
  return { context, page }
}

async function navigateToSessionRules(page: Page): Promise<void> {
  await page.goto('/settings')
  await page.getByRole('button', { name: /^session rules$/i }).click()
  await expect(page.getByText(/session duration/i).first()).toBeVisible({ timeout: 15000 })
}

/** Read the current session duration value from the input */
async function getSessionDuration(page: Page): Promise<string> {
  return page.getByLabel(/session duration/i).inputValue()
}

test.describe.serial('Multi-User: Session Settings Proposal', () => {
  let aliceContext: BrowserContext
  let bobContext: BrowserContext
  let alicePage: Page
  let bobPage: Page
  let originalDuration: string

  test.beforeAll(async ({ browser }) => {
    const alice = await createContextAndPage(browser)
    const bob = await createContextAndPage(browser)
    aliceContext = alice.context
    bobContext = bob.context
    alicePage = alice.page
    bobPage = bob.page

    await Promise.all([login(alicePage, ALICE.email, ALICE.password), login(bobPage, BOB.email, BOB.password)])
  })

  test.afterAll(async () => {
    // Restore original session duration
    if (originalDuration) {
      await navigateToSessionRules(alicePage)
      const durationInput = alicePage.getByLabel(/session duration/i)
      await durationInput.clear()
      await durationInput.fill(originalDuration)
      await alicePage.getByRole('button', { name: /save session rules/i }).click()
      await alicePage.waitForTimeout(2000)
    }
    await aliceContext.close()
    await bobContext.close()
  })

  test('Alice changes session duration and saves', async () => {
    await navigateToSessionRules(alicePage)

    // Record the original duration for cleanup
    originalDuration = await getSessionDuration(alicePage)

    // Change the session duration to a new value
    const newDuration = originalDuration === '20' ? '25' : '20'
    const durationInput = alicePage.getByLabel(/session duration/i)
    await durationInput.clear()
    await durationInput.fill(newDuration)

    // Click Save Session Rules
    await alicePage.getByRole('button', { name: /save session rules/i }).click()

    // Verify success feedback (inline message)
    await expect(alicePage.getByText('Session settings updated')).toBeVisible({ timeout: 15000 })
  })

  test('Bob sees the updated settings or proposal banner', async () => {
    await navigateToSessionRules(bobPage)

    // The session settings flow may show a proposal banner or update the value directly.
    // Check for either the proposal banner or the updated duration value.
    const proposalBanner = bobPage.getByText(/session settings proposal/i)
    const updatedDuration = bobPage.getByLabel(/session duration/i)

    // Wait for the page to fully load
    await bobPage.waitForLoadState('networkidle')

    // Either the proposal banner is shown, or the duration was updated
    const hasProposal = await proposalBanner.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasProposal) {
      // Proposal flow: verify the banner details
      await expect(proposalBanner).toBeVisible()
      await expect(bobPage.getByText(/your partner has proposed changes/i)).toBeVisible()
    } else {
      // Direct update flow: verify the Session Rules tab loaded correctly
      await expect(updatedDuration).toBeVisible()
      const bobDuration = await updatedDuration.inputValue()
      // The duration should reflect the new value Alice set
      const expectedDuration = originalDuration === '20' ? '25' : '20'
      expect(bobDuration).toBe(expectedDuration)
    }
  })
})
