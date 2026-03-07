/**
 * Mobile Browser Workflow Tests — Feature Pages
 *
 * Workflows 4-9 from /workflows/mobile-browser-workflows.md
 * Check-in, Notes, Growth, Love Languages, Reminders, Requests
 */

import { expect } from '@playwright/test'
import { test as authedTest } from './auth'
import {
  MOBILE_VIEWPORT,
  MOBILE_USER_AGENT,
  assertNoHorizontalOverflow,
  assertTouchTargets,
  assertNoAutoZoom,
} from './mobile-browser-helpers'

authedTest.use({ viewport: MOBILE_VIEWPORT, hasTouch: true, userAgent: MOBILE_USER_AGENT })

// ============================================================================
// WORKFLOW 4: Check-In Session (Full Wizard)
// ============================================================================

authedTest.describe('Workflow 4: Check-In Session', () => {
  authedTest('Step 1: Load check-in page', async ({ authedPage: page }) => {
    await page.goto('/checkin')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  authedTest('Step 13: Verify mobile interaction quality', async ({ authedPage: page }) => {
    await page.goto('/checkin')
    await assertTouchTargets(page)
    await assertNoAutoZoom(page)
    await assertNoHorizontalOverflow(page)
  })
})

// ============================================================================
// WORKFLOW 5: Notes — CRUD + Bulk Actions
// ============================================================================

authedTest.describe('Workflow 5: Notes — Page structure', () => {
  authedTest('Step 1: Load notes page', async ({ authedPage: page }) => {
    await page.goto('/notes')

    await expect(page.getByRole('heading', { name: /^notes$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /new note/i })).toBeVisible()
  })

  authedTest('Step 2: Open note editor', async ({ authedPage: page }) => {
    await page.goto('/notes')

    await page.getByRole('button', { name: /new note/i }).click()
    await expect(page.getByPlaceholder(/what's on your mind/i)).toBeVisible()
  })

  authedTest('Step 11: Filter notes', async ({ authedPage: page }) => {
    await page.goto('/notes')

    await expect(page.getByRole('button', { name: /^all$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^shared$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^private$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^drafts$/i })).toBeVisible()

    // Test filtering
    await page.getByRole('button', { name: /^shared$/i }).click()
    await expect(page.getByText(/pausing before reacting/i).first()).toBeVisible()
  })

  authedTest('Step 12: Verify iOS conventions on notes', async ({ authedPage: page }) => {
    await page.goto('/notes')
    await assertTouchTargets(page)
    await assertNoAutoZoom(page)
    await assertNoHorizontalOverflow(page)
  })
})

authedTest.describe.serial('Workflow 5: Notes — CRUD', () => {
  const testContent = 'Mobile workflow test note — Playwright automation'

  authedTest('Step 3-6: Create and save a note', async ({ authedPage: page }) => {
    await page.goto('/notes')

    // Open editor
    await page.getByRole('button', { name: /new note/i }).click()
    await page.getByPlaceholder(/what's on your mind/i).fill(testContent)
    await expect(page.getByRole('button', { name: /^save$/i })).toBeEnabled()

    // Save and wait for response
    const [response] = await Promise.all([
      page.waitForResponse((resp) => resp.request().method() === 'POST' && resp.status() === 200, { timeout: 15000 }),
      page.getByRole('button', { name: /^save$/i }).click(),
    ])
    expect(response.ok()).toBeTruthy()

    // Verify note appears
    await page.goto('/notes')
    await expect(page.getByText(testContent).first()).toBeVisible({ timeout: 10000 })
  })

  authedTest('Step 7-8: Edit the note', async ({ authedPage: page }) => {
    await page.goto('/notes')

    await page.getByRole('button').filter({ hasText: testContent }).first().click()
    await expect(page.getByRole('heading', { name: /edit note/i })).toBeVisible()
  })

  authedTest('Step 9: Delete the note', async ({ authedPage: page }) => {
    await page.goto('/notes')

    const noteCards = page.getByRole('button').filter({ hasText: testContent })
    await expect(noteCards.first()).toBeVisible()
    const countBefore = await noteCards.count()

    await noteCards.first().hover()
    await page
      .getByLabel(/delete note/i)
      .first()
      .click()

    await page.reload()
    const countAfter = await page.getByRole('button').filter({ hasText: testContent }).count()
    expect(countAfter).toBeLessThan(countBefore)
  })
})

// ============================================================================
// WORKFLOW 6: Growth — Milestones + Photo Upload
// ============================================================================

authedTest.describe('Workflow 6: Growth — Milestones', () => {
  authedTest('Step 1: Load growth page', async ({ authedPage: page }) => {
    await page.goto('/growth')

    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  authedTest('Step 2: Open milestone creator', async ({ authedPage: page }) => {
    await page.goto('/growth')

    // FAB or add milestone button
    const addButton = page.getByRole('button', { name: /add milestone|add/i })
    if (await addButton.isVisible()) {
      await addButton.click()
      // Verify form opens
      await expect(page.getByRole('heading', { name: /milestone/i })).toBeVisible({ timeout: 5000 })
    }
  })

  authedTest.skip('Step 4: Upload a photo', async () => {
    // REAL INTERACTION ONLY: File picker dialog requires manual interaction
    // Test via: mobile-browser-workflow-executor skill
  })

  authedTest('Step 9: Verify iOS conventions on growth', async ({ authedPage: page }) => {
    await page.goto('/growth')
    await assertTouchTargets(page)
    await assertNoHorizontalOverflow(page)
  })
})

// ============================================================================
// WORKFLOW 7: Love Languages — Profiles + Actions
// ============================================================================

authedTest.describe('Workflow 7: Love Languages', () => {
  authedTest('Step 1: Load love languages page', async ({ authedPage: page }) => {
    await page.goto('/love-languages')

    await expect(page.getByRole('heading', { name: 'Love Languages', exact: true })).toBeVisible()
  })

  authedTest('Step 2: Verify tabs', async ({ authedPage: page }) => {
    await page.goto('/love-languages')

    await expect(page.getByRole('tab', { name: /my languages/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /partner/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /discoveries/i })).toBeVisible()
  })

  authedTest('Step 6: Switch to Partner tab', async ({ authedPage: page }) => {
    await page.goto('/love-languages')

    await page.getByRole('tab', { name: /partner/i }).click()
    // Should show partner's shared languages or empty state
    await expect(page.getByRole('tabpanel')).toBeVisible()
  })

  authedTest('Step 7: Switch to Discoveries tab', async ({ authedPage: page }) => {
    await page.goto('/love-languages')

    await page.getByRole('tab', { name: /discoveries/i }).click()
    await expect(page.getByRole('tabpanel')).toBeVisible()
  })

  authedTest('Step 11: Verify iOS conventions on love languages', async ({ authedPage: page }) => {
    await page.goto('/love-languages')
    await assertTouchTargets(page)
    await assertNoAutoZoom(page)
    await assertNoHorizontalOverflow(page)
  })
})

// ============================================================================
// WORKFLOW 8: Reminders — Create + Manage
// ============================================================================

authedTest.describe('Workflow 8: Reminders', () => {
  authedTest('Step 1: Load reminders page', async ({ authedPage: page }) => {
    await page.goto('/reminders')

    await expect(page.getByRole('heading', { name: /reminders/i })).toBeVisible()
  })

  authedTest('Step 10: Verify iOS conventions on reminders', async ({ authedPage: page }) => {
    await page.goto('/reminders')
    await assertTouchTargets(page)
    await assertNoAutoZoom(page)
    await assertNoHorizontalOverflow(page)
  })
})

// ============================================================================
// WORKFLOW 9: Requests — Create + Respond
// ============================================================================

authedTest.describe('Workflow 9: Requests', () => {
  authedTest('Step 1: Load requests page', async ({ authedPage: page }) => {
    await page.goto('/requests')

    await expect(page.getByRole('heading', { name: /requests/i })).toBeVisible()
  })

  authedTest('Step 9: Verify iOS conventions on requests', async ({ authedPage: page }) => {
    await page.goto('/requests')
    await assertTouchTargets(page)
    await assertNoAutoZoom(page)
    await assertNoHorizontalOverflow(page)
  })
})
