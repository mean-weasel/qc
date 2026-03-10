/**
 * Browser Workflow 20: Settings — Notifications & Personalization
 * Auto-generated from browser-workflows.md
 *
 * Verifies theme toggle in header, dark/light mode switching,
 * theme persistence, settings tabs, and privacy/terms navigation.
 */

import { test as unauthTest, expect as unauthExpect } from '@playwright/test'
import { test, expect } from '../auth'

test.describe('Workflow 20: Settings — Notifications & Personalization', () => {
  test.describe('Theme toggle', () => {
    test('theme toggle button visible in header', async ({ authedPage: page }) => {
      await page.goto('/settings')

      const themeButton = page.getByRole('button', { name: /switch to (light|dark) mode/i })
      await expect(themeButton).toBeVisible()
    })

    test('theme toggle changes dark/light mode', async ({ authedPage: page }) => {
      await page.goto('/dashboard')

      // Record initial theme state
      const initialIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))

      // Click theme toggle
      const themeButton = page.getByRole('button', { name: /switch to (light|dark) mode/i })
      await themeButton.click()

      // Wait for theme transition
      await page.waitForTimeout(300)

      // Verify theme changed
      const afterToggleIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
      expect(afterToggleIsDark).not.toBe(initialIsDark)

      // Verify data-theme attribute also updated
      const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
      expect(dataTheme).toBe(afterToggleIsDark ? 'dark' : 'light')

      // Toggle back to restore original state
      await themeButton.click()
      await page.waitForTimeout(300)

      const restoredIsDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
      expect(restoredIsDark).toBe(initialIsDark)
    })

    test('theme persists after reload', async ({ authedPage: page }) => {
      await page.goto('/dashboard')

      // Toggle theme
      const themeButton = page.getByRole('button', { name: /switch to (light|dark) mode/i })
      await themeButton.click()
      await page.waitForTimeout(300)

      const themeAfterToggle = await page.evaluate(() => document.documentElement.classList.contains('dark'))

      // Reload the page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Verify theme persisted via localStorage
      const themeAfterReload = await page.evaluate(() => document.documentElement.classList.contains('dark'))
      expect(themeAfterReload).toBe(themeAfterToggle)

      // Toggle back to restore original state
      await page.getByRole('button', { name: /switch to (light|dark) mode/i }).click()
    })
  })

  test.describe('Settings page tabs', () => {
    test('renders all settings tabs', async ({ authedPage: page }) => {
      await page.goto('/settings')

      await expect(page.getByRole('button', { name: /^profile$/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /^relationship$/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /^session rules$/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /^categories$/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /^reminders$/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /^notifications$/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /^appearance$/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /data & privacy/i })).toBeVisible()
    })
  })

  test.describe('Privacy and Terms links', () => {
    // Landing page redirects authed users to /dashboard, so use unauthenticated context
    unauthTest('Privacy Policy link navigates to /privacy', async ({ page }) => {
      await page.goto('/')

      const privacyLink = page.locator('footer').getByRole('link', { name: /privacy policy/i })
      await unauthExpect(privacyLink).toBeVisible()
      await unauthExpect(privacyLink).toHaveAttribute('href', '/privacy')
    })

    unauthTest('Terms of Service link navigates to /terms', async ({ page }) => {
      await page.goto('/')

      const termsLink = page.locator('footer').getByRole('link', { name: /terms of service/i })
      await unauthExpect(termsLink).toBeVisible()
      await unauthExpect(termsLink).toHaveAttribute('href', '/terms')
    })
  })
})
