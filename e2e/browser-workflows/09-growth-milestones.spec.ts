/**
 * Browser Workflow 9: Growth & Milestones
 *
 * Auto-generated from browser-workflows.md
 * Tests growth page structure, stats, milestone creation modal, and view modes.
 */

import { test, expect } from '../auth'

test.describe('Growth & Milestones — Page structure', () => {
  test('growth page renders with heading', async ({ authedPage: page }) => {
    await page.goto('/growth')

    await expect(page.getByRole('heading', { name: /growth gallery/i })).toBeVisible()
  })

  test('"New Milestone" button is visible', async ({ authedPage: page }) => {
    await page.goto('/growth')

    await expect(page.getByRole('button', { name: /new milestone/i })).toBeVisible()
  })
})

test.describe('Growth & Milestones — Stats tiles', () => {
  test('stats tiles are visible', async ({ authedPage: page }) => {
    await page.goto('/growth')

    await expect(page.getByText('Milestones Reached').first()).toBeVisible()
    await expect(page.getByText('Total Points').first()).toBeVisible()
  })
})

test.describe('Growth & Milestones — New Milestone modal', () => {
  test('New Milestone opens creation modal', async ({ authedPage: page }) => {
    await page.goto('/growth')

    await page.getByRole('button', { name: /new milestone/i }).click()

    await expect(page.getByText(/create new milestone/i)).toBeVisible()
  })

  test('creation modal has title input, description textarea, category, rarity, and points', async ({
    authedPage: page,
  }) => {
    await page.goto('/growth')

    await page.getByRole('button', { name: /new milestone/i }).click()
    await expect(page.getByText(/create new milestone/i)).toBeVisible()

    // Title input
    await expect(page.getByPlaceholder(/first month of check-ins/i)).toBeVisible()

    // Description textarea
    await expect(page.getByPlaceholder(/describe this milestone/i)).toBeVisible()

    // Category selection (grid of category buttons)
    const modal = page.locator('[class*="fixed"]').filter({ hasText: /create new milestone/i })
    await expect(modal.locator('button', { hasText: /Communication/ })).toBeVisible()

    // Rarity selector
    await expect(page.getByText(/rarity/i).first()).toBeVisible()

    // Points control
    await expect(page.getByText(/points/i).first()).toBeVisible()
  })
})

test.describe('Growth & Milestones — View modes', () => {
  test('Timeline view shows milestones', async ({ authedPage: page }) => {
    await page.goto('/growth')

    // Timeline is default view -- verify milestones are present by checking for month group buttons
    await expect(page.getByRole('button', { name: /timeline/i })).toBeVisible()

    // Seed milestones should have month groups
    const monthButtons = page.locator('button').filter({ hasText: /\d{4}/ })
    await expect(monthButtons.first()).toBeVisible({ timeout: 15000 })
  })

  test('Progress view shows growth bars', async ({ authedPage: page }) => {
    await page.goto('/growth')

    await page.getByRole('button', { name: /progress/i }).click()

    await expect(page.getByText(/milestones complete/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/milestones upcoming/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/completion rate/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('Memories/gallery view renders', async ({ authedPage: page }) => {
    await page.goto('/growth')

    await page.getByRole('button', { name: /memories/i }).click()

    await expect(page.getByText(/photos/i).first()).toBeVisible()
  })
})
