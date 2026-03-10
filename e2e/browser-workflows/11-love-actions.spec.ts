/**
 * Browser Workflow 11: Love Actions
 *
 * Auto-generated from browser-workflows.md
 * Tests the Love Actions page at /love-languages/actions including tab filtering,
 * Add Action dialog fields, and content switching between tabs.
 */

import { test, expect } from '../auth'

test.describe('Workflow 11: Love Actions — Page structure', () => {
  test('page loads at /love-languages/actions', async ({ authedPage: page }) => {
    await page.goto('/love-languages/actions')

    await expect(page.getByRole('heading', { name: /love actions/i })).toBeVisible({ timeout: 15000 })
  })

  test('tab filters visible: Pending, Recurring, Completed', async ({ authedPage: page }) => {
    await page.goto('/love-languages/actions')

    await expect(page.getByRole('tab', { name: /pending/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /recurring/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /completed/i })).toBeVisible()
  })

  test('Add Action button visible', async ({ authedPage: page }) => {
    await page.goto('/love-languages/actions')

    await expect(page.getByRole('button', { name: /add action/i })).toBeVisible()
  })
})

test.describe('Workflow 11: Love Actions — Add Action dialog', () => {
  test('Add Action opens dialog with form fields', async ({ authedPage: page }) => {
    await page.goto('/love-languages/actions')

    await page.getByRole('button', { name: /add action/i }).click()

    await expect(page.getByRole('heading', { name: /add love action/i })).toBeVisible()
    const dialog = page.getByRole('dialog')
    await expect(page.getByLabel(/action title/i)).toBeVisible()
    await expect(page.getByLabel(/description/i)).toBeVisible()
    await expect(dialog.getByText('Love Language', { exact: true })).toBeVisible()
    await expect(dialog.getByText(/status/i).first()).toBeVisible()
    await expect(dialog.getByText(/frequency/i).first()).toBeVisible()
    await expect(dialog.getByText(/difficulty/i).first()).toBeVisible()
  })

  test('Cancel button closes the dialog', async ({ authedPage: page }) => {
    await page.goto('/love-languages/actions')

    await page.getByRole('button', { name: /add action/i }).click()
    await expect(page.getByRole('heading', { name: /add love action/i })).toBeVisible()

    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('heading', { name: /add love action/i })).not.toBeVisible()
  })
})

test.describe('Workflow 11: Love Actions — Tab filtering', () => {
  test('clicking Recurring tab switches content', async ({ authedPage: page }) => {
    await page.goto('/love-languages/actions')

    await page.getByRole('tab', { name: /recurring/i }).click()

    // Recurring tab panel should be visible (either actions or empty state)
    await expect(
      page.getByText(/no recurring actions/i).or(page.getByRole('button', { name: /mark complete/i }).first()),
    ).toBeVisible({ timeout: 10000 })
  })

  test('clicking Completed tab switches content', async ({ authedPage: page }) => {
    await page.goto('/love-languages/actions')

    await page.getByRole('tab', { name: /completed/i }).click()

    // Completed tab panel should be visible (either actions or empty state)
    await expect(page.getByText(/no completed actions yet/i).or(page.getByText(/completed/i).first())).toBeVisible({
      timeout: 10000,
    })
  })

  test('clicking Pending tab returns to default content', async ({ authedPage: page }) => {
    await page.goto('/love-languages/actions')

    // Switch away first
    await page.getByRole('tab', { name: /completed/i }).click()
    await expect(page.getByRole('tab', { name: /completed/i })).toHaveAttribute('data-state', 'active')

    // Switch back to Pending
    await page.getByRole('tab', { name: /pending/i }).click()
    await expect(page.getByRole('tab', { name: /pending/i })).toHaveAttribute('data-state', 'active')
  })
})
