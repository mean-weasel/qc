/**
 * Browser Workflow 7: Check-in Preparation (Bookends)
 *
 * Auto-generated from browser-workflows.md
 * Tests the preparation modal for topic selection before a check-in session.
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

test.describe('Check-in Preparation — Landing', () => {
  test('check-in page shows "Prepare Topics" button', async ({ authedPage: page }) => {
    await goToCheckinLanding(page)

    await expect(page.getByRole('button', { name: /topics/i })).toBeVisible()
  })
})

test.describe('Check-in Preparation — Modal', () => {
  test('clicking Prepare Topics opens preparation modal', async ({ authedPage: page }) => {
    await goToCheckinLanding(page)

    await page.getByRole('button', { name: /topics/i }).click()

    await expect(page.getByText(/prepare for your check-in/i)).toBeVisible({ timeout: 10000 })
  })

  test('quick topic chips are displayed in the modal', async ({ authedPage: page }) => {
    await goToCheckinLanding(page)

    await page.getByRole('button', { name: /topics/i }).click()
    await expect(page.getByText(/prepare for your check-in/i)).toBeVisible({ timeout: 10000 })

    // Quick Topics section should be visible with topic chips
    await expect(page.getByText(/quick topics/i)).toBeVisible()
  })

  test('clicking a topic chip adds it to "Your Topics" list', async ({ authedPage: page }) => {
    await goToCheckinLanding(page)

    await page.getByRole('button', { name: /topics/i }).click()
    await expect(page.getByText(/prepare for your check-in/i)).toBeVisible({ timeout: 10000 })

    // Dismiss Next.js dev overlay that intercepts pointer events
    await page.evaluate(() => {
      document.querySelectorAll('nextjs-portal').forEach((el) => el.remove())
      document.querySelectorAll('[data-nextjs-dev-overlay]').forEach((el) => el.remove())
    })

    // Click the first quick topic chip within the modal dialog
    const dialog = page.getByRole('dialog')
    const quickTopicButtons = dialog.locator('button').filter({ hasText: /^\S+\s+\w/ })
    const firstChip = quickTopicButtons.first()
    await firstChip.click()

    // "Your Topics" section should appear with the added topic
    await expect(page.getByText(/your topics/i)).toBeVisible({ timeout: 10000 })
  })

  test('custom topic input allows adding custom topics', async ({ authedPage: page }) => {
    await goToCheckinLanding(page)

    await page.getByRole('button', { name: /topics/i }).click()
    await expect(page.getByText(/prepare for your check-in/i)).toBeVisible({ timeout: 10000 })

    const customInput = page.getByPlaceholder(/something specific you want to discuss/i)
    await expect(customInput).toBeVisible()

    await customInput.fill('Our weekend plans')
    await customInput.press('Enter')

    // "Your Topics" section should appear with the custom topic
    await expect(page.getByText(/your topics/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/our weekend plans/i)).toBeVisible()
  })

  test('remove button (X) removes a topic from the list', async ({ authedPage: page }) => {
    await goToCheckinLanding(page)

    await page.getByRole('button', { name: /topics/i }).click()
    await expect(page.getByText(/prepare for your check-in/i)).toBeVisible({ timeout: 10000 })

    // Add a custom topic first
    const customInput = page.getByPlaceholder(/something specific you want to discuss/i)
    await customInput.fill('Topic to remove')
    await customInput.press('Enter')

    await expect(page.getByText(/topic to remove/i)).toBeVisible({ timeout: 10000 })

    // Click the X button next to the topic to remove it
    const topicRow = page
      .locator('div')
      .filter({ hasText: /topic to remove/i })
      .first()
    await topicRow.locator('button').last().click()

    // The topic should be removed
    await expect(page.getByText(/topic to remove/i)).not.toBeVisible({ timeout: 10000 })
  })

  test('"Start Check-In with Topics" button is present', async ({ authedPage: page }) => {
    await goToCheckinLanding(page)

    await page.getByRole('button', { name: /topics/i }).click()
    await expect(page.getByText(/prepare for your check-in/i)).toBeVisible({ timeout: 10000 })

    await expect(page.getByRole('button', { name: /start check-in with topics/i })).toBeVisible()
  })
})
