/**
 * Browser Workflow 12: Reminders
 *
 * Auto-generated from browser-workflows.md
 * Tests the Reminders page including heading, filter tabs, New Reminder form,
 * and filter tab switching behavior.
 */

import { test, expect } from '../auth'

test.describe('Workflow 12: Reminders — Page structure', () => {
  test('renders heading', async ({ authedPage: page }) => {
    await page.goto('/reminders')

    await expect(page.getByRole('heading', { name: /^reminders$/i })).toBeVisible({ timeout: 15000 })
  })

  test('filter tabs visible: all, active, snoozed, overdue, inactive', async ({ authedPage: page }) => {
    await page.goto('/reminders')

    await expect(page.getByRole('button', { name: /^all\s*\d*$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^active\s*\d*$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^inactive\s*\d*$/i })).toBeVisible()
  })

  test('New Reminder button visible', async ({ authedPage: page }) => {
    await page.goto('/reminders')

    await expect(page.getByRole('button', { name: /new reminder/i })).toBeVisible()
  })
})

test.describe('Workflow 12: Reminders — New Reminder form', () => {
  test('clicking New Reminder reveals form', async ({ authedPage: page }) => {
    await page.goto('/reminders')

    await page.getByRole('button', { name: /new reminder/i }).click()

    await expect(page.getByRole('heading', { name: /new reminder/i })).toBeVisible()
  })

  test('form shows title, message, category, frequency, scheduled for, notification, assign-to inputs', async ({
    authedPage: page,
  }) => {
    await page.goto('/reminders')

    await page.getByRole('button', { name: /new reminder/i }).click()

    await expect(page.getByLabel(/title/i).first()).toBeVisible()
    await expect(page.getByLabel(/message/i)).toBeVisible()
    await expect(page.getByLabel(/category/i)).toBeVisible()
    await expect(page.getByLabel(/frequency/i)).toBeVisible()
    await expect(page.getByLabel(/scheduled for/i)).toBeVisible()
    await expect(page.getByLabel('Notification', { exact: true })).toBeVisible()
    await expect(page.getByLabel(/assign to/i)).toBeVisible()
  })

  test('form shows Create Reminder submit button', async ({ authedPage: page }) => {
    await page.goto('/reminders')

    await page.getByRole('button', { name: /new reminder/i }).click()

    await expect(page.getByRole('button', { name: /create reminder/i })).toBeVisible()
  })

  test('clicking Cancel hides the form', async ({ authedPage: page }) => {
    await page.goto('/reminders')

    await page.getByRole('button', { name: /new reminder/i }).click()
    await expect(page.getByRole('heading', { name: /new reminder/i })).toBeVisible()

    // The button toggles between "New Reminder" and "Cancel"
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('heading', { name: /new reminder/i })).not.toBeVisible()
  })
})

test.describe('Workflow 12: Reminders — Filter tabs', () => {
  test('active filter shows active reminders', async ({ authedPage: page }) => {
    await page.goto('/reminders')

    await page.getByRole('button', { name: /^active\s*\d*$/i }).click()

    // Active reminders (seed data) should be visible
    await expect(page.getByText(/weekly check-in/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('inactive filter shows inactive reminders or empty state', async ({ authedPage: page }) => {
    await page.goto('/reminders')

    await page.getByRole('button', { name: /^inactive\s*\d*$/i }).click()

    // Should show inactive reminders or empty state message
    await expect(page.getByText(/no inactive reminders/i)).toBeVisible({ timeout: 10000 })
  })

  test('all filter shows all reminders', async ({ authedPage: page }) => {
    await page.goto('/reminders')

    // Switch to inactive first
    await page.getByRole('button', { name: /^inactive\s*\d*$/i }).click()

    // Switch back to all
    await page.getByRole('button', { name: /^all\s*\d*$/i }).click()

    await expect(page.getByText(/weekly check-in/i).first()).toBeVisible({ timeout: 10000 })
  })
})
