/**
 * Browser Workflow 18: Mobile Navigation
 * Auto-generated from browser-workflows.md
 *
 * Verifies mobile bottom tab bar, sidebar drawer, navigation behavior,
 * and sign-out button visibility at 375px mobile viewport.
 */

import { test, expect } from '../auth'

test.use({ viewport: { width: 375, height: 812 } })

test.describe('Workflow 18: Mobile Navigation', () => {
  test.describe('Bottom tab bar', () => {
    test('bottom tab bar visible with Dashboard, Check-in, Notes, Growth items', async ({ authedPage: page }) => {
      await page.goto('/dashboard')

      await expect(page.getByRole('link', { name: /dashboard/i }).last()).toBeVisible()
      await expect(page.getByRole('link', { name: /check-in/i }).last()).toBeVisible()
      await expect(page.getByRole('link', { name: /notes/i }).last()).toBeVisible()
      await expect(page.getByRole('link', { name: /growth/i }).last()).toBeVisible()
    })

    test('sidebar is hidden at mobile width', async ({ authedPage: page }) => {
      await page.goto('/dashboard')

      // Desktop sidebar uses lg:flex lg:fixed — should be hidden at 375px
      const sidebar = page.locator('.hidden.lg\\:flex.lg\\:fixed')
      await expect(sidebar).toBeHidden()
    })

    test('tab items navigate correctly', async ({ authedPage: page }) => {
      await page.goto('/dashboard')

      // Dismiss Next.js dev overlay that intercepts pointer events on mobile
      await page.evaluate(() => {
        document.querySelectorAll('nextjs-portal').forEach((el) => el.remove())
        document.querySelectorAll('[data-nextjs-dev-overlay]').forEach((el) => el.remove())
      })

      // Click Check-in tab and verify URL
      await page
        .getByRole('link', { name: /check-in/i })
        .last()
        .click()
      await expect(page).toHaveURL(/\/checkin/)

      // Click Notes tab and verify URL
      await page.getByRole('link', { name: /notes/i }).last().click()
      await expect(page).toHaveURL(/\/notes/)

      // Click Growth tab and verify URL
      await page
        .getByRole('link', { name: /growth/i })
        .last()
        .click()
      await expect(page).toHaveURL(/\/growth/)

      // Click Dashboard tab and verify URL
      await page
        .getByRole('link', { name: /dashboard/i })
        .last()
        .click()
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('active tab is highlighted', async ({ authedPage: page }) => {
      await page.goto('/dashboard')

      // The active dashboard tab should have the rose text color class
      const dashboardTab = page.getByRole('link', { name: /dashboard/i }).last()
      await expect(dashboardTab).toBeVisible()

      // Verify active state by checking CSS class — active tab has text-rose-600
      const hasActiveClass = await dashboardTab.evaluate((el) => el.classList.contains('text-rose-600'))
      expect(hasActiveClass).toBe(true)
    })
  })

  test.describe('More drawer', () => {
    test('More button opens drawer with remaining nav items', async ({ authedPage: page }) => {
      await page.goto('/dashboard')

      // Tap the More button
      await page.getByRole('button', { name: 'More', exact: true }).click()

      // Wait for sidebar to appear
      await expect(page.getByRole('heading', { name: 'Menu' })).toBeVisible()

      // Verify sidebar-specific links (scope to sidebar to avoid dashboard duplicates)
      const sidebarNav = page.locator('.fixed.inset-y-0.right-0 nav')
      await expect(sidebarNav.getByRole('link', { name: 'Reminders' })).toBeVisible()
      await expect(sidebarNav.getByRole('link', { name: 'Love Languages' })).toBeVisible()
      await expect(sidebarNav.getByRole('link', { name: 'Requests' })).toBeVisible()
      await expect(sidebarNav.getByRole('link', { name: 'Settings' })).toBeVisible()
    })

    test('drawer item navigates and closes drawer', async ({ authedPage: page }) => {
      await page.goto('/dashboard')

      // Open More drawer
      await page.getByRole('button', { name: 'More', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Menu' })).toBeVisible()

      // Click Settings link scoped to sidebar nav
      const sidebarNav = page.locator('.fixed.inset-y-0.right-0 nav')
      await sidebarNav.getByRole('link', { name: /settings/i }).click()

      // Verify navigation and drawer closed
      await expect(page).toHaveURL(/\/settings/)
      await expect(page.getByRole('heading', { name: 'Menu' })).not.toBeVisible()
    })

    test('Sign Out button visible in drawer', async ({ authedPage: page }) => {
      await page.goto('/dashboard')

      // Open More drawer
      await page.getByRole('button', { name: 'More', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Menu' })).toBeVisible()

      // Sign Out button should be visible in the sidebar
      await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible()
    })
  })
})
