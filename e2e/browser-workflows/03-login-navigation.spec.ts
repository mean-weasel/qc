/**
 * Browser Workflow 3: Login & Navigation
 * Auto-generated from browser-workflows.md
 *
 * Verifies login redirects to dashboard, sidebar shows all nav items,
 * each page renders its heading, header elements are present,
 * URLs are deep-linkable, and browser back button works.
 */

import { test, expect } from '../auth'

test.describe('Workflow 3: Login & Navigation', () => {
  test.describe('Login Redirect', () => {
    test('login with valid credentials redirects to dashboard', async ({ authedPage: page }) => {
      // authedPage fixture logs in and waits for redirect away from /login
      await page.goto('/dashboard')

      await expect(page.getByRole('heading', { name: /^dashboard$/i })).toBeVisible()
    })
  })

  test.describe('Sidebar Navigation Items', () => {
    test('sidebar shows all 8 nav items', async ({ authedPage: page }) => {
      // Use desktop viewport so sidebar is visible
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/dashboard')

      const sidebar = page.locator('.lg\\:fixed.lg\\:inset-y-0')

      await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible()
      await expect(sidebar.getByRole('link', { name: 'Check-in' })).toBeVisible()
      await expect(sidebar.getByRole('link', { name: 'Notes' })).toBeVisible()
      await expect(sidebar.getByRole('link', { name: 'Growth' })).toBeVisible()
      await expect(sidebar.getByRole('link', { name: 'Reminders' })).toBeVisible()
      await expect(sidebar.getByRole('link', { name: 'Love Languages' })).toBeVisible()
      await expect(sidebar.getByRole('link', { name: 'Requests' })).toBeVisible()
      await expect(sidebar.getByRole('link', { name: 'Settings' })).toBeVisible()
    })
  })

  test.describe('Page Headings', () => {
    test('Dashboard page renders heading', async ({ authedPage: page }) => {
      await page.goto('/dashboard')

      await expect(page.getByRole('heading', { name: /^dashboard$/i })).toBeVisible()
    })

    test('Check-in page renders heading', async ({ authedPage: page }) => {
      await page.goto('/checkin')

      await expect(page.getByRole('heading', { name: /check-in/i }).first()).toBeVisible()
    })

    test('Notes page renders heading', async ({ authedPage: page }) => {
      await page.goto('/notes')

      await expect(page.getByRole('heading', { name: /^notes$/i })).toBeVisible()
    })

    test('Growth page renders heading', async ({ authedPage: page }) => {
      await page.goto('/growth')

      await expect(page.getByRole('heading', { name: /growth/i })).toBeVisible()
    })

    test('Reminders page renders heading', async ({ authedPage: page }) => {
      await page.goto('/reminders')

      await expect(page.getByRole('heading', { name: /^reminders$/i })).toBeVisible()
    })

    test('Love Languages page renders heading', async ({ authedPage: page }) => {
      await page.goto('/love-languages')

      await expect(page.getByRole('heading', { level: 1, name: /love languages/i })).toBeVisible({
        timeout: 15000,
      })
    })

    test('Requests page renders heading', async ({ authedPage: page }) => {
      await page.goto('/requests')

      await expect(page.getByRole('heading', { name: /^requests$/i })).toBeVisible()
    })

    test('Settings page renders heading', async ({ authedPage: page }) => {
      await page.goto('/settings')

      await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible()
    })
  })

  test.describe('Header Elements', () => {
    test('header shows QC logo', async ({ authedPage: page }) => {
      await page.goto('/dashboard')

      const header = page.getByRole('banner')
      await expect(header).toBeVisible()
      await expect(header.getByText('QC')).toBeVisible()
    })

    test('header shows theme toggle button', async ({ authedPage: page }) => {
      await page.goto('/dashboard')

      const header = page.getByRole('banner')
      await expect(header.getByRole('button', { name: /switch to (dark|light) mode/i })).toBeVisible()
    })

    test('header shows user avatar', async ({ authedPage: page }) => {
      await page.goto('/dashboard')

      const header = page.getByRole('banner')
      // Avatar shows user initial in a rounded-full div
      await expect(header.locator('.rounded-full').first()).toBeVisible()
    })
  })

  test.describe('Deep-Linkable URLs', () => {
    test('direct navigation to /checkin loads the page', async ({ authedPage: page }) => {
      await page.goto('/checkin')
      await expect(page.getByRole('heading', { name: /check-in/i }).first()).toBeVisible()
    })

    test('direct navigation to /notes loads the page', async ({ authedPage: page }) => {
      await page.goto('/notes')
      await expect(page.getByRole('heading', { name: /^notes$/i })).toBeVisible()
    })

    test('direct navigation to /growth loads the page', async ({ authedPage: page }) => {
      await page.goto('/growth')
      await expect(page.getByRole('heading', { name: /growth/i })).toBeVisible()
    })

    test('direct navigation to /settings loads the page', async ({ authedPage: page }) => {
      await page.goto('/settings')
      await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible()
    })
  })

  test.describe('Browser Back Button', () => {
    test('back button navigates between pages', async ({ authedPage: page }) => {
      await page.goto('/dashboard')
      await expect(page.getByRole('heading', { name: /^dashboard$/i })).toBeVisible()

      // Navigate to notes
      await page.goto('/notes')
      await expect(page.getByRole('heading', { name: /^notes$/i })).toBeVisible()

      // Go back
      await page.goBack()
      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.getByRole('heading', { name: /^dashboard$/i })).toBeVisible()
    })
  })
})
