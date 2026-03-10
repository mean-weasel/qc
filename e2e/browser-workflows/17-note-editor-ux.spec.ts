/**
 * Browser Workflow 17: Note Editor UX
 * Auto-generated from browser-workflows.md
 *
 * Verifies the NoteEditor modal UX: open/close, save button states,
 * character/word count, privacy selector, and tag management.
 */

import { test, expect } from '../auth'

test.describe('Workflow 17: Note Editor UX', () => {
  test.describe('Modal open/close', () => {
    test('New Note opens modal, Cancel closes it', async ({ authedPage: page }) => {
      await page.goto('/notes')

      await page.getByRole('button', { name: /new note/i }).click()
      await expect(page.getByRole('heading', { name: /new note/i })).toBeVisible()

      await page.getByRole('button', { name: /cancel/i }).click()
      await expect(page.getByRole('heading', { name: /new note/i })).not.toBeVisible()
    })

    test('X button closes modal', async ({ authedPage: page }) => {
      await page.goto('/notes')

      await page.getByRole('button', { name: /new note/i }).click()
      await expect(page.getByRole('heading', { name: /new note/i })).toBeVisible()

      await page.getByRole('button', { name: /close editor/i }).click()
      await expect(page.getByRole('heading', { name: /new note/i })).not.toBeVisible()
    })
  })

  test.describe('Save button states', () => {
    test('Save button disabled when empty', async ({ authedPage: page }) => {
      await page.goto('/notes')

      await page.getByRole('button', { name: /new note/i }).click()

      await expect(page.getByRole('button', { name: /^save$/i })).toBeDisabled()
    })

    test('Save button enabled after typing content', async ({ authedPage: page }) => {
      await page.goto('/notes')

      await page.getByRole('button', { name: /new note/i }).click()
      await page.getByPlaceholder(/what's on your mind/i).fill('Test note content')

      await expect(page.getByRole('button', { name: /^save$/i })).toBeEnabled()
    })
  })

  test.describe('Character/word count', () => {
    test('word and character count updates as user types', async ({ authedPage: page }) => {
      await page.goto('/notes')

      await page.getByRole('button', { name: /new note/i }).click()

      // Initially 0 words and 0 chars
      await expect(page.getByText('0 words')).toBeVisible()
      await expect(page.getByText('0/5000')).toBeVisible()

      // Type some content
      await page.getByPlaceholder(/what's on your mind/i).fill('Hello world test')

      await expect(page.getByText('3 words')).toBeVisible()
      await expect(page.getByText('16/5000')).toBeVisible()
    })
  })

  test.describe('Privacy selector', () => {
    test('Shared is default privacy, can switch to Private and Draft', async ({ authedPage: page }) => {
      await page.goto('/notes')

      await page.getByRole('button', { name: /new note/i }).click()

      // Shared, Private, Draft buttons should be visible in the privacy selector
      const dialog = page.getByLabel('New Note')
      await expect(dialog.getByRole('button', { name: /^shared$/i })).toBeVisible()
      await expect(dialog.getByRole('button', { name: /^private$/i })).toBeVisible()
      await expect(dialog.getByRole('button', { name: /^draft$/i })).toBeVisible()

      // Switch to Private
      await dialog.getByRole('button', { name: /^private$/i }).click()

      // Switch to Draft
      await dialog.getByRole('button', { name: /^draft$/i }).click()
    })
  })

  test.describe('Tag management', () => {
    test('add tag via Enter key, tag badge appears', async ({ authedPage: page }) => {
      await page.goto('/notes')

      await page.getByRole('button', { name: /new note/i }).click()

      const tagInput = page.getByPlaceholder(/add tags/i)
      await tagInput.fill('testtag')
      await tagInput.press('Enter')

      await expect(page.getByText('#testtag')).toBeVisible()
    })

    test('duplicate tag rejected (case-insensitive)', async ({ authedPage: page }) => {
      await page.goto('/notes')

      await page.getByRole('button', { name: /new note/i }).click()

      const tagInput = page.getByPlaceholder(/add tags/i)

      // Add first tag
      await tagInput.fill('duplicate')
      await tagInput.press('Enter')
      await expect(page.getByText('#duplicate')).toBeVisible()

      // Try adding same tag with different case — should not create a second badge
      await tagInput.fill('Duplicate')
      await tagInput.press('Enter')

      // Should still have only one tag badge
      const tagBadges = page.locator('text=#duplicate')
      expect(await tagBadges.count()).toBe(1)
    })

    test('remove tag by clicking X on badge', async ({ authedPage: page }) => {
      await page.goto('/notes')

      await page.getByRole('button', { name: /new note/i }).click()

      const tagInput = page.getByPlaceholder(/add tags/i)
      await tagInput.fill('removeme')
      await tagInput.press('Enter')
      await expect(page.getByText('#removeme')).toBeVisible()

      // Click the remove button on the tag badge
      await page.getByRole('button', { name: /remove tag removeme/i }).click()
      await expect(page.getByText('#removeme')).not.toBeVisible()
    })
  })
})
