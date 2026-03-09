/**
 * Browser Workflow 5: Dark Mode Toggle
 * Auto-generated from browser-workflows.md
 *
 * Verifies the theme toggle button is visible, toggles dark/light mode
 * by updating the document element class, and persists across page reloads.
 */

import { test, expect } from '../auth'

test.describe('Workflow 5: Dark Mode Toggle', () => {
  test('theme toggle button is visible in header', async ({ authedPage: page }) => {
    await page.goto('/dashboard')

    const header = page.getByRole('banner')
    await expect(header.getByRole('button', { name: /switch to (dark|light) mode/i })).toBeVisible()
  })

  test('clicking toggle changes theme', async ({ authedPage: page }) => {
    await page.goto('/dashboard')

    // Start in light mode (default) — document should not have "dark" class
    const hasDarkBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDarkBefore).toBe(false)

    // Click the theme toggle
    const themeButton = page.getByRole('banner').getByRole('button', { name: /switch to dark mode/i })
    await themeButton.click()

    // After toggle, document should have "dark" class
    const hasDarkAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDarkAfter).toBe(true)

    // data-theme attribute should also be "dark"
    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    expect(dataTheme).toBe('dark')
  })

  test('theme persists after page reload', async ({ authedPage: page }) => {
    await page.goto('/dashboard')

    // Toggle to dark mode
    const themeButton = page.getByRole('banner').getByRole('button', { name: /switch to dark mode/i })
    await themeButton.click()

    // Verify dark mode is active
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDark).toBe(true)

    // Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Dark mode should persist after reload
    const hasDarkAfterReload = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(hasDarkAfterReload).toBe(true)

    // Toggle back to light mode to clean up
    const lightButton = page.getByRole('banner').getByRole('button', { name: /switch to light mode/i })
    await lightButton.click()
  })
})
