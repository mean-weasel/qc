/**
 * Browser Workflow 10: Love Languages
 *
 * Auto-generated from browser-workflows.md
 * Tests love languages page structure, tabs, add dialog, and partner/discovery views.
 */

import { test, expect } from '../auth'

test.describe('Love Languages — Page structure', () => {
  test('love languages page renders with heading', async ({ authedPage: page }) => {
    await page.goto('/love-languages')

    await expect(page.getByRole('heading', { level: 1, name: /love languages/i })).toBeVisible({ timeout: 15000 })
  })

  test('tabs visible: "My Languages", "Partner\'s", "Discoveries"', async ({ authedPage: page }) => {
    await page.goto('/love-languages')

    await expect(page.getByRole('tab', { name: /my languages/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /partner/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /discoveries/i })).toBeVisible()
  })

  test('"Add Language" button visible', async ({ authedPage: page }) => {
    await page.goto('/love-languages')

    await expect(page.getByRole('button', { name: /add language/i })).toBeVisible()
  })
})

test.describe('Love Languages — Add Language dialog', () => {
  test('Add Language opens dialog', async ({ authedPage: page }) => {
    await page.goto('/love-languages')

    await page.getByRole('button', { name: /add language/i }).click()

    await expect(page.getByRole('heading', { name: /add love language/i })).toBeVisible()
  })

  test('dialog has title, description, category dropdown, importance, privacy, examples, tags', async ({
    authedPage: page,
  }) => {
    await page.goto('/love-languages')

    await page.getByRole('button', { name: /add language/i }).click()
    await expect(page.getByRole('heading', { name: /add love language/i })).toBeVisible()

    // Title
    await expect(page.getByLabel(/title/i)).toBeVisible()

    // Description
    await expect(page.getByLabel(/description/i)).toBeVisible()

    // Category dropdown
    await expect(page.getByText(/category/i).first()).toBeVisible()

    // Importance radio group
    await expect(page.getByText(/importance/i).first()).toBeVisible()
    await expect(page.getByText('Low', { exact: true })).toBeVisible()
    await expect(page.getByText('Medium', { exact: true })).toBeVisible()
    await expect(page.getByText('High', { exact: true })).toBeVisible()
    await expect(page.getByText('Essential', { exact: true })).toBeVisible()

    // Privacy radio group
    await expect(page.getByText(/privacy/i).first()).toBeVisible()
    await expect(page.getByText('Private', { exact: true })).toBeVisible()
    await expect(page.getByText('Shared with partner', { exact: true })).toBeVisible()

    // Examples
    await expect(page.getByText(/examples/i).first()).toBeVisible()

    // Tags
    await expect(page.getByText(/tags/i).first()).toBeVisible()
  })
})

test.describe("Love Languages — Partner's tab", () => {
  test("Partner's tab shows partner's shared languages or empty state", async ({ authedPage: page }) => {
    await page.goto('/love-languages')

    await page.getByRole('tab', { name: /partner/i }).click()

    // Bob has seeded shared languages (Acts of Service, Physical Touch)
    const partnerContent = page.getByText(/acts of service/i).or(page.getByText(/no shared languages/i))
    await expect(partnerContent.first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Love Languages — Discoveries tab', () => {
  test('Discoveries tab renders', async ({ authedPage: page }) => {
    await page.goto('/love-languages')

    await page.getByRole('tab', { name: /discoveries/i }).click()

    // Either empty state heading or the tab panel content
    const discoveriesContent = page.getByRole('heading', { name: /no discoveries yet/i }).or(page.getByRole('tabpanel'))
    await expect(discoveriesContent.first()).toBeVisible({ timeout: 10000 })
  })
})
