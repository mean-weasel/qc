/**
 * Browser Workflow 15: Settings - Session Rules & Categories
 *
 * Auto-generated from browser-workflows.md
 * Tests the Session Rules tab including form fields, switch states,
 * and saving session rules with success feedback.
 */

import { test, expect } from '../auth'

test.describe('Workflow 15: Settings — Session Rules tab', () => {
  test('renders Session Rules heading', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()

    await expect(page.getByRole('heading', { name: /session rules/i })).toBeVisible({ timeout: 15000 })
  })

  test('session duration input is visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()

    await expect(page.getByLabel(/session duration/i)).toBeVisible()
  })

  test('timeouts per partner input is visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()

    await expect(page.getByLabel(/timeouts per partner/i)).toBeVisible()
  })

  test('Allow Extensions switch is checked', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()

    await expect(page.getByRole('switch', { name: /allow extensions/i })).toBeChecked()
  })

  test('Warm-Up Questions switch is checked', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()

    await expect(page.getByRole('switch', { name: /warm-up questions/i })).toBeChecked()
  })

  test('Turn-Based Mode switch is unchecked', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()

    await expect(page.getByRole('switch', { name: /turn-based mode/i })).not.toBeChecked()
  })

  test('Save Session Rules button is visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()

    await expect(page.getByRole('button', { name: /save session rules/i })).toBeVisible()
  })
})

test.describe.serial('Workflow 15: Settings — Save session rules', () => {
  test('saving session rules shows success message', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()
    // Wait for tab content to fully render before interacting
    await expect(page.getByRole('heading', { name: /session rules/i })).toBeVisible()
    await page.getByRole('button', { name: /save session rules/i }).click()

    // Check for inline success message (more reliable than toast in CI)
    await expect(page.getByText('Session settings updated')).toBeVisible({ timeout: 15000 })
  })
})
