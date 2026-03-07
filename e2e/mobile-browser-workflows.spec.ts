/**
 * Mobile Browser Workflow Tests — Landing, Login, Dashboard, Navigation
 *
 * Workflows 1-3 from /workflows/mobile-browser-workflows.md
 * Tests run in Playwright Chromium with iPhone 15 Pro mobile viewport (393x852).
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
// WORKFLOW 1: Landing → Signup → Onboarding
// ============================================================================

base.describe('Workflow 1: Landing → Signup → Onboarding', () => {
  base('Step 1: Load landing page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading').first()).toBeVisible()

    // Verify CTAs are visible (nav has Sign Up, hero has "Get started free")
    await expect(page.getByRole('navigation').getByRole('link', { name: /sign up/i })).toBeVisible()
    await expect(page.getByRole('navigation').getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  base('Step 2: Navigate to signup', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('navigation')
      .getByRole('link', { name: /sign up/i })
      .click()
    await expect(page).toHaveURL(/\/signup/)

    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  base('Step 3: Signup form has correct input sizes', async ({ page }) => {
    await page.goto('/signup')
    await assertNoAutoZoom(page)
    await assertTouchTargets(page)
  })

  base('Step 12: Verify iOS platform conventions on signup', async ({ page }) => {
    await page.goto('/signup')
    await assertNoHorizontalOverflow(page)
    await assertTouchTargets(page)
    await assertNoAutoZoom(page)
  })
})

// ============================================================================
// WORKFLOW 2: Login → Dashboard
// ============================================================================

base.describe('Workflow 2: Login → Dashboard', () => {
  base('Step 1: Load login page', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /github/i })).toBeVisible()
  })

  base('Step 2-3: Login form inputs prevent iOS auto-zoom', async ({ page }) => {
    await page.goto('/login')
    await assertNoAutoZoom(page)
  })

  base('Step 7: Verify iOS platform conventions on login', async ({ page }) => {
    await page.goto('/login')
    await assertNoHorizontalOverflow(page)
    await assertTouchTargets(page)
  })
})

authedTest.describe('Workflow 2: Dashboard (authenticated)', () => {
  authedTest('Step 4: Verify dashboard layout', async ({ authedPage: page }) => {
    await page.goto('/dashboard')

    // Header visible
    await expect(page.getByRole('banner')).toBeVisible()
    // Bottom tab bar visible
    await expect(page.locator('nav').last()).toBeVisible()
    // Quick action cards
    await expect(page.getByRole('heading', { name: /start check-in/i })).toBeVisible()
  })

  authedTest('Step 5: Verify dashboard content', async ({ authedPage: page }) => {
    await page.goto('/dashboard')

    const main = page.getByRole('main')
    await expect(main.getByText('Check-ins', { exact: true }).first()).toBeVisible()
    await expect(main.getByText('Notes', { exact: true }).first()).toBeVisible()
  })

  authedTest('Step 6-7: Verify dashboard touch targets and iOS conventions', async ({ authedPage: page }) => {
    await page.goto('/dashboard')
    await dismissDevOverlay(page)
    await assertNoHorizontalOverflow(page)
    await assertTouchTargets(page)
  })
})

// ============================================================================
// WORKFLOW 3: Bottom Tab Navigation + More Sidebar
// ============================================================================

authedTest.describe('Workflow 3: Bottom Tab Navigation + More Sidebar', () => {
  authedTest('Step 1: Verify bottom tab bar', async ({ authedPage: page }) => {
    await page.goto('/dashboard')

    // Verify tab labels
    await expect(page.getByRole('link', { name: /dashboard/i }).last()).toBeVisible()
    await expect(page.getByRole('link', { name: /check-in/i }).last()).toBeVisible()
    await expect(page.getByRole('link', { name: /notes/i }).last()).toBeVisible()
    await expect(page.getByRole('link', { name: /growth/i }).last()).toBeVisible()
  })

  authedTest('Step 2: Navigate via tabs', async ({ authedPage: page }) => {
    await page.goto('/dashboard')
    await dismissDevOverlay(page)

    // Tap Notes tab
    await page.getByRole('link', { name: /notes/i }).last().click()
    await expect(page).toHaveURL(/\/notes/)

    // Tap Growth tab
    await page
      .getByRole('link', { name: /growth/i })
      .last()
      .click()
    await expect(page).toHaveURL(/\/growth/)

    // Tap Dashboard tab
    await page
      .getByRole('link', { name: /dashboard/i })
      .last()
      .click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  authedTest('Step 3-4: Open More sidebar', async ({ authedPage: page }) => {
    await page.goto('/dashboard')
    await dismissDevOverlay(page)

    // Find and tap the "More" button (exact match to avoid "Show more")
    const moreButton = page.getByRole('button', { name: 'More', exact: true })
    await moreButton.click()

    // Wait for sidebar to appear
    await expect(page.getByRole('heading', { name: 'Menu' })).toBeVisible()

    // Verify sidebar-specific links are visible (scope to sidebar to avoid dashboard duplicates)
    const sidebarNav = page.locator('.fixed.inset-y-0.right-0 nav')
    await expect(sidebarNav.getByRole('link', { name: 'Settings' })).toBeVisible()
    await expect(sidebarNav.getByRole('link', { name: 'Love Languages' })).toBeVisible()
  })

  authedTest('Step 5: Navigate from sidebar', async ({ authedPage: page }) => {
    await page.goto('/dashboard')
    await dismissDevOverlay(page)

    // Open More and navigate to Settings (unique to sidebar — not a dashboard quick action card)
    await page.getByRole('button', { name: 'More', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Menu' })).toBeVisible()

    // Click Settings link scoped to sidebar nav
    const sidebarNav = page.locator('.fixed.inset-y-0.right-0 nav')
    await sidebarNav.getByRole('link', { name: /settings/i }).click()
    await expect(page).toHaveURL(/\/settings/)
  })

  authedTest('Step 8: Verify tab bar touch targets', async ({ authedPage: page }) => {
    await page.goto('/dashboard')
    await dismissDevOverlay(page)
    await assertTouchTargets(page)
    await assertNoHorizontalOverflow(page)
  })
})
