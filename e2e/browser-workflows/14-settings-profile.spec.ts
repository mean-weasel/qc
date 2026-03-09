/**
 * Browser Workflow 14: Settings - Profile & Relationship
 *
 * Auto-generated from browser-workflows.md
 * Tests the Settings page including Profile tab fields, Relationship tab content,
 * Danger Zone, and serial save/restore of display name.
 */

import { test, expect } from '../auth'

test.describe('Workflow 14: Settings — Page structure', () => {
  test('renders heading', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible({ timeout: 15000 })
  })

  test('Profile, Relationship, Session Rules tab buttons visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('button', { name: /^profile$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^relationship$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^session rules$/i })).toBeVisible()
  })
})

test.describe('Workflow 14: Settings — Profile tab', () => {
  test('email field shows alice@test.com and is disabled', async ({ authedPage: page }) => {
    await page.goto('/settings')

    const emailInput = page.getByLabel(/^email$/i)
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveValue('alice@test.com')
    await expect(emailInput).toBeDisabled()
  })

  test('display name field is pre-filled with Alice', async ({ authedPage: page }) => {
    await page.goto('/settings')

    const nameInput = page.getByLabel(/display name/i)
    await expect(nameInput).toBeVisible()
    await expect(nameInput).toHaveValue('Alice')
  })

  test('avatar URL field is visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByLabel(/avatar url/i)).toBeVisible()
  })

  test('Save Profile button is visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('button', { name: /save profile/i })).toBeVisible()
  })
})

test.describe('Workflow 14: Settings — Relationship tab', () => {
  test('shows couple name "Alice & Bob"', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^relationship$/i }).click()

    await expect(page.getByText('Alice & Bob')).toBeVisible()
  })

  test('shows partner name "Bob"', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^relationship$/i }).click()

    await expect(page.getByText('Bob', { exact: true })).toBeVisible()
  })

  test('Danger Zone section with Leave Couple button', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^relationship$/i }).click()

    await expect(page.getByRole('heading', { name: /danger zone/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /leave couple/i })).toBeVisible()
  })
})

test.describe.serial('Workflow 14: Settings — Save profile', () => {
  test('saving profile with new display name persists after reload', async ({ authedPage: page }) => {
    await page.goto('/settings')

    const nameInput = page.getByLabel(/display name/i)
    await expect(nameInput).toBeVisible()
    await nameInput.clear()
    await nameInput.fill('Alice Test')
    await page.getByRole('button', { name: /save profile/i }).click()

    // Verify the value persisted by reloading and checking the input value
    await page.waitForLoadState('networkidle')
    await page.reload()
    await expect(page.getByLabel(/display name/i)).toHaveValue('Alice Test', { timeout: 15000 })
  })

  test('restoring original display name succeeds', async ({ authedPage: page }) => {
    await page.goto('/settings')

    const nameInput = page.getByLabel(/display name/i)
    await expect(nameInput).toBeVisible()
    await nameInput.clear()
    await nameInput.fill('Alice')
    await page.getByRole('button', { name: /save profile/i }).click()

    // Verify the value persisted by reloading and checking the input value
    await page.waitForLoadState('networkidle')
    await page.reload()
    await expect(page.getByLabel(/display name/i)).toHaveValue('Alice', { timeout: 15000 })
  })
})
