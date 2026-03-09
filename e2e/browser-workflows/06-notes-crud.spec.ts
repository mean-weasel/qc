/**
 * Browser Workflow 6: Notes CRUD
 *
 * Auto-generated from browser-workflows.md
 * Tests notes page structure, filtering, search, and full CRUD lifecycle.
 */

import { test, expect } from '../auth'

test.describe('Notes CRUD — Page structure', () => {
  test('renders heading, New Note button, filter pills, and search bar', async ({ authedPage: page }) => {
    await page.goto('/notes')

    await expect(page.getByRole('heading', { name: /^notes$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /new note/i })).toBeVisible()

    // Filter pills
    await expect(page.getByRole('button', { name: /^all$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^shared$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^private$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^drafts$/i })).toBeVisible()

    // Search bar
    await expect(page.getByPlaceholder(/search notes/i).first()).toBeVisible()
  })
})

test.describe('Notes CRUD — New Note modal', () => {
  test('New Note button opens modal with heading "New Note"', async ({ authedPage: page }) => {
    await page.goto('/notes')

    await page.getByRole('button', { name: /new note/i }).click()

    await expect(page.getByRole('heading', { name: /new note/i })).toBeVisible()
  })

  test('modal has privacy selector, textarea with placeholder, and tags input', async ({ authedPage: page }) => {
    await page.goto('/notes')

    await page.getByRole('button', { name: /new note/i }).click()

    // Privacy selector options (Shared, Private, Draft)
    await expect(page.getByText('Shared', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Private', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Draft', { exact: true }).first()).toBeVisible()

    // Textarea
    await expect(page.getByPlaceholder(/what's on your mind/i)).toBeVisible()

    // Tags input
    await expect(page.getByPlaceholder(/add tags/i).or(page.getByText(/tags/i).first())).toBeVisible()
  })

  test('Save button disabled when textarea empty', async ({ authedPage: page }) => {
    await page.goto('/notes')

    await page.getByRole('button', { name: /new note/i }).click()

    await expect(page.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })
})

test.describe('Notes CRUD — Filtering', () => {
  test('Shared filter shows only shared notes', async ({ authedPage: page }) => {
    await page.goto('/notes')

    await page.getByRole('button', { name: /^shared$/i }).click()

    await expect(page.getByText(/pausing before reacting/i).first()).toBeVisible()
    await expect(page.getByText(/savings target/i).first()).toBeVisible()
  })

  test('Private filter shows empty state', async ({ authedPage: page }) => {
    await page.goto('/notes')

    await page.getByRole('button', { name: /^private$/i }).click()

    await expect(page.getByRole('heading', { name: /no notes found/i })).toBeVisible()
  })

  test('Drafts filter shows empty state', async ({ authedPage: page }) => {
    await page.goto('/notes')

    await page.getByRole('button', { name: /^drafts$/i }).click()

    await expect(page.getByRole('heading', { name: /no notes found/i })).toBeVisible()
  })
})

test.describe('Notes CRUD — Search', () => {
  test('search filters notes by content', async ({ authedPage: page }) => {
    await page.goto('/notes')

    await page
      .getByPlaceholder(/search notes/i)
      .first()
      .fill('savings')

    await expect(page.getByText(/savings target/i).first()).toBeVisible()
    await expect(page.getByText(/pausing before reacting/i)).not.toBeVisible()
  })
})

test.describe.serial('Notes CRUD — Create, Edit, Delete', () => {
  const testContent = 'Browser workflow E2E note — automated test content'
  const updatedContent = 'Browser workflow E2E note — updated by playwright'

  test('creates a new note and it appears in the list', async ({ authedPage: page }) => {
    await page.goto('/notes')

    await page.getByRole('button', { name: /new note/i }).click()
    await page.getByPlaceholder(/what's on your mind/i).fill(testContent)
    await expect(page.getByRole('button', { name: /^save$/i })).toBeEnabled()

    const [response] = await Promise.all([
      page.waitForResponse((resp) => resp.request().method() === 'POST' && resp.status() === 200, { timeout: 15000 }),
      page.getByRole('button', { name: /^save$/i }).click(),
    ])
    expect(response.ok()).toBeTruthy()

    // Navigate fresh to verify note persisted
    await page.goto('/notes')
    await expect(page.getByText(testContent).first()).toBeVisible({ timeout: 10000 })
  })

  test('clicking note card opens Edit Note modal, update saves changes', async ({ authedPage: page }) => {
    await page.goto('/notes')

    await page.getByRole('button').filter({ hasText: testContent }).first().click()
    await expect(page.getByRole('heading', { name: /edit note/i })).toBeVisible()

    const textarea = page.getByPlaceholder(/what's on your mind/i)
    await textarea.clear()
    await textarea.fill(updatedContent)
    await expect(page.getByRole('button', { name: /^update$/i })).toBeEnabled()

    const [response] = await Promise.all([
      page.waitForResponse((resp) => resp.request().method() === 'POST' && resp.status() === 200, { timeout: 15000 }),
      page.getByRole('button', { name: /^update$/i }).click(),
    ])
    expect(response.ok()).toBeTruthy()

    // Navigate fresh to verify update persisted
    await page.goto('/notes')
    await expect(page.getByText(updatedContent).first()).toBeVisible({ timeout: 10000 })
  })

  test('deleting note removes it from the list', async ({ authedPage: page }) => {
    await page.goto('/notes')

    const noteCards = page.getByRole('button').filter({ hasText: updatedContent })
    await expect(noteCards.first()).toBeVisible()
    const countBefore = await noteCards.count()

    await noteCards.first().hover()
    await page
      .getByLabel(/delete note/i)
      .first()
      .click()

    // Reload and verify at least one copy was removed
    await page.reload()
    const countAfter = await page.getByRole('button').filter({ hasText: updatedContent }).count()
    expect(countAfter).toBeLessThan(countBefore)
  })
})
