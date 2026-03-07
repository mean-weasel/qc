/**
 * Mobile Browser Workflow Tests — Settings, Theme, Invite, iOS HIG
 *
 * Workflows 10-14 + cross-cutting iOS HIG compliance checks
 * from /workflows/mobile-browser-workflows.md
 */

import { test as base, expect } from '@playwright/test'
import { test as authedTest } from './auth'
import {
  MOBILE_VIEWPORT,
  MOBILE_USER_AGENT,
  dismissDevOverlay,
  assertNoHorizontalOverflow,
  assertTouchTargets,
  assertNoAutoZoom,
} from './mobile-browser-helpers'

base.use({ viewport: MOBILE_VIEWPORT, hasTouch: true, userAgent: MOBILE_USER_AGENT })
authedTest.use({ viewport: MOBILE_VIEWPORT, hasTouch: true, userAgent: MOBILE_USER_AGENT })

// ============================================================================
// WORKFLOW 10: Settings — Profile + Couple
// ============================================================================

authedTest.describe('Workflow 10: Settings — Profile', () => {
  authedTest('Step 1: Load settings page', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  })

  authedTest('Step 2: Profile display name is editable', async ({ authedPage: page }) => {
    await page.goto('/settings')

    const displayNameInput = page.getByLabel(/display name/i)
    await expect(displayNameInput).toBeVisible()
    await expect(displayNameInput).toBeEditable()
  })

  authedTest('Step 9: Verify form inputs', async ({ authedPage: page }) => {
    await page.goto('/settings')
    await assertNoAutoZoom(page)
    await assertTouchTargets(page)
  })

  authedTest('Step 10: Verify iOS conventions on settings', async ({ authedPage: page }) => {
    await page.goto('/settings')
    await assertNoHorizontalOverflow(page)
  })
})

// ============================================================================
// WORKFLOW 11: Settings — Session Rules + Categories
// ============================================================================

authedTest.describe('Workflow 11: Settings — Session Rules', () => {
  authedTest('Step 2: Verify timing fields layout at mobile width', async ({ authedPage: page }) => {
    await page.goto('/settings')

    // Verify no horizontal overflow in session rules section
    await assertNoHorizontalOverflow(page)
  })

  authedTest('Step 4-6: Verify switches are used (not checkboxes)', async ({ authedPage: page }) => {
    await page.goto('/settings')

    // Navigate to Session Rules tab first
    await page.getByRole('button', { name: /session rules/i }).click()

    // Look for Switch components (role=switch) — Radix Switch uses hidden checkboxes internally
    const switches = page.getByRole('switch')
    const switchCount = await switches.count()

    // Should have multiple switches for session rules toggles
    expect(switchCount).toBeGreaterThan(0)
  })

  authedTest('Step 11: Verify iOS conventions on session rules', async ({ authedPage: page }) => {
    await page.goto('/settings')
    await assertTouchTargets(page)
    await assertNoAutoZoom(page)
    await assertNoHorizontalOverflow(page)
  })
})

// ============================================================================
// WORKFLOW 12: Empty States
// ============================================================================

authedTest.describe('Workflow 12: Empty States', () => {
  authedTest('Step 6: Verify iOS conventions for empty states', async ({ authedPage: page }) => {
    // Notes page — check specific empty state via draft filter (unlikely to have drafts in seed)
    await page.goto('/notes')
    await page.getByRole('button', { name: /^drafts$/i }).click()

    // Either shows "No notes found" or note cards — verify page doesn't overflow
    await assertNoHorizontalOverflow(page)
    await assertTouchTargets(page)
  })
})

// ============================================================================
// WORKFLOW 13: Theme Toggle (Light/Dark)
// ============================================================================

authedTest.describe('Workflow 13: Theme Toggle', () => {
  authedTest('Step 1-2: Toggle theme', async ({ authedPage: page }) => {
    await page.goto('/dashboard')

    // Find theme toggle button
    const themeButton = page.getByRole('button', { name: /switch to (light|dark) mode/i })
    await expect(themeButton).toBeVisible()
    await themeButton.click()

    // Wait for theme transition
    await page.waitForTimeout(500)
  })

  authedTest('Step 2: Theme toggle has adequate touch target', async ({ authedPage: page }) => {
    await page.goto('/dashboard')

    const themeButton = page.getByRole('button', { name: /switch to (light|dark) mode/i })
    const box = await themeButton.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(43.5)
    expect(box!.height).toBeGreaterThanOrEqual(43.5)
  })

  authedTest('Step 5: Theme persists across navigation', async ({ authedPage: page }) => {
    await page.goto('/dashboard')

    // Toggle to dark mode
    const themeButton = page.getByRole('button', { name: /switch to (light|dark) mode/i })
    await themeButton.click()
    await page.waitForTimeout(300)

    // Check if dark class is applied
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))

    // Navigate to another page
    await page.goto('/notes')
    await page.waitForTimeout(300)

    // Check theme persists
    const stillDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(stillDark).toBe(isDark)
  })
})

// ============================================================================
// WORKFLOW 14: Partner Invite Acceptance
// ============================================================================

base.describe('Workflow 14: Partner Invite', () => {
  base('Step 5: Verify expired/invalid invite handling', async ({ page }) => {
    // Navigate to invalid invite
    await page.goto('/invite/00000000-0000-0000-0000-000000000000')

    // Should show error state with heading "Invalid Invite"
    await expect(page.getByRole('heading', { name: /invalid invite/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /go to login|log in|sign in/i })).toBeVisible()
  })

  base('Step 6: Verify malformed token handling', async ({ page }) => {
    await page.goto('/invite/not-a-valid-token')

    await expect(page.getByRole('heading', { name: /invalid invite/i })).toBeVisible()
  })

  base('Step 7: Verify iOS conventions on invite page', async ({ page }) => {
    await page.goto('/invite/00000000-0000-0000-0000-000000000000')
    await assertTouchTargets(page)
    await assertNoHorizontalOverflow(page)
  })
})

// ============================================================================
// CROSS-CUTTING: iOS HIG Compliance
// ============================================================================

authedTest.describe('iOS HIG Compliance — Touch Targets', () => {
  const pages = ['/dashboard', '/notes', '/growth', '/love-languages', '/reminders', '/requests', '/settings']

  for (const pagePath of pages) {
    authedTest(`Touch targets on ${pagePath}`, async ({ authedPage: page }) => {
      await page.goto(pagePath)
      await dismissDevOverlay(page)
      await assertTouchTargets(page)
    })
  }
})

authedTest.describe('iOS HIG Compliance — No Auto-Zoom', () => {
  const pagesWithInputs = ['/notes', '/settings', '/reminders', '/requests']

  for (const pagePath of pagesWithInputs) {
    authedTest(`No auto-zoom inputs on ${pagePath}`, async ({ authedPage: page }) => {
      await page.goto(pagePath)
      await assertNoAutoZoom(page)
    })
  }
})

authedTest.describe('iOS HIG Compliance — No Horizontal Overflow', () => {
  const pages = [
    '/dashboard',
    '/notes',
    '/growth',
    '/love-languages',
    '/reminders',
    '/requests',
    '/settings',
    '/checkin',
  ]

  for (const pagePath of pages) {
    authedTest(`No horizontal overflow on ${pagePath}`, async ({ authedPage: page }) => {
      await page.goto(pagePath)
      await assertNoHorizontalOverflow(page)
    })
  }
})

authedTest.describe('iOS HIG Compliance — Switch Components', () => {
  authedTest('Settings uses Switch components (not checkboxes)', async ({ authedPage: page }) => {
    await page.goto('/settings')

    // Navigate to Session Rules tab where switches are used
    await page.getByRole('button', { name: /session rules/i }).click()

    // Should have Switch role elements (Radix Switch uses hidden checkboxes internally — that's expected)
    const switches = page.getByRole('switch')
    expect(await switches.count()).toBeGreaterThan(0)
  })
})

authedTest.describe('iOS HIG Compliance — Bottom Navigation', () => {
  authedTest('Bottom tab bar is visible and fixed', async ({ authedPage: page }) => {
    await page.goto('/dashboard')

    // Navigate links in bottom nav
    const dashboardTab = page.getByRole('link', { name: /dashboard/i }).last()
    await expect(dashboardTab).toBeVisible()

    // Verify tab bar stays visible after scroll
    await page.evaluate(() => window.scrollTo(0, 500))
    await expect(dashboardTab).toBeVisible()
  })
})
