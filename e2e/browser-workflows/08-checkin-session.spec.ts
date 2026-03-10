/**
 * Browser Workflow 8: Check-in Session (full wizard)
 *
 * Auto-generated from browser-workflows.md
 * Tests the complete check-in wizard flow from landing through completion.
 */

import { type Page } from '@playwright/test'
import { test, expect } from '../auth'

async function goToCheckinLanding(page: Page): Promise<void> {
  await page.goto('/checkin')
  await page.waitForURL('**/checkin')
  await page.waitForLoadState('networkidle')
  const landingHeading = page.getByRole('heading', { name: /relationship check-in/i })
  const wizardIndicator = page.getByText(/categories selected/i)
  await expect(landingHeading.or(wizardIndicator)).toBeVisible({ timeout: 15000 })
  if (await wizardIndicator.isVisible()) {
    await page.getByRole('button', { name: /cancel/i }).click({ force: true })
    await page.goto('/checkin')
    await page.waitForURL('**/checkin')
    await page.waitForLoadState('networkidle')
    await expect(landingHeading).toBeVisible({ timeout: 15000 })
  }
}

async function startWizard(page: Page): Promise<void> {
  await goToCheckinLanding(page)
  await expect(page.getByRole('heading', { name: 'Communication', exact: true })).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: /now/i }).click()
  await expect(page.getByText(/4 categories selected/i)).toBeVisible({ timeout: 10000 })
}

async function advanceToWarmUp(page: Page): Promise<void> {
  await startWizard(page)
  const startBtn = page.getByRole('button', { name: /start discussion/i })
  await expect(startBtn).toBeVisible({ timeout: 10000 })
  await startBtn.click()
  await expect(startBtn).toBeVisible({ timeout: 10000 })
  await startBtn.click()
  await expect(page.getByRole('heading', { name: /warm-up questions/i })).toBeVisible({ timeout: 10000 })
}

async function advanceToDiscussion(page: Page): Promise<void> {
  await advanceToWarmUp(page)
  await page
    .getByRole('button', { name: /continue/i })
    .first()
    .click()
  await expect(page.getByRole('button', { name: /continue to reflection/i })).toBeVisible({ timeout: 10000 })
}

async function advanceToReflection(page: Page): Promise<void> {
  await advanceToDiscussion(page)
  await page.getByRole('button', { name: /continue to reflection/i }).click()
  await expect(page.getByRole('heading', { name: /reflection/i })).toBeVisible({ timeout: 10000 })
}

async function advanceToActionItems(page: Page): Promise<void> {
  await advanceToReflection(page)
  await page.getByRole('button', { name: /continue to action items/i }).click()
  await expect(page.getByRole('heading', { name: /action items/i })).toBeVisible({ timeout: 10000 })
}

async function advanceToCompletion(page: Page): Promise<void> {
  await advanceToActionItems(page)
  await page.getByRole('button', { name: /continue/i }).click()
  await expect(page.getByRole('heading', { name: /check-in complete/i })).toBeVisible({ timeout: 10000 })
}

test.describe('Check-in Session — Full Wizard', () => {
  test.describe.configure({ mode: 'serial' })

  test('landing page shows categories, Start Now button, and session rules', async ({ authedPage: page }) => {
    await goToCheckinLanding(page)
    await expect(page.getByRole('heading', { name: 'Communication', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quality Time', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Future Planning', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Challenges', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /now/i })).toBeVisible()
    await expect(page.getByText(/your session rules/i)).toBeVisible()
  })

  test('Start Now begins session with categories pre-selected', async ({ authedPage: page }) => {
    await startWizard(page)
    await expect(page.getByRole('heading', { name: /relationship check-in/i })).not.toBeVisible({ timeout: 10000 })
  })

  test('category selection step shows all 4 categories and Start Discussion button', async ({ authedPage: page }) => {
    await startWizard(page)
    await expect(page.getByRole('heading', { name: 'Communication', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quality Time', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Future Planning', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Challenges', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /start discussion/i })).toBeVisible()
  })

  test('Start Discussion advances through warm-up with shuffle and skip buttons', async ({ authedPage: page }) => {
    await advanceToWarmUp(page)
    await expect(page.getByRole('button', { name: /shuffle/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /skip/i })).toBeVisible()
  })

  test('continuing through warm-up reaches discussion step', async ({ authedPage: page }) => {
    await advanceToDiscussion(page)
    await expect(page.getByRole('tab', { name: /private notes/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /shared notes/i })).toBeVisible()
  })

  test('discussion step has note tabs and text area', async ({ authedPage: page }) => {
    await advanceToDiscussion(page)
    await expect(
      page.getByPlaceholder(/share your thoughts/i).or(page.getByPlaceholder(/write your private/i)),
    ).toBeVisible()
  })

  test('Continue to Reflection shows reflection heading', async ({ authedPage: page }) => {
    await advanceToReflection(page)
  })

  test('Continue to Action Items shows action items heading', async ({ authedPage: page }) => {
    await advanceToActionItems(page)
  })

  test('Continue to Completion shows celebration with Go Home and Start Another', async ({ authedPage: page }) => {
    await advanceToCompletion(page)
    await expect(page.getByRole('button', { name: /go home/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /start another/i })).toBeVisible()
  })

  test('Go Home navigates to dashboard', async ({ authedPage: page }) => {
    await advanceToCompletion(page)
    await page.getByRole('button', { name: /go home/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  })
})
