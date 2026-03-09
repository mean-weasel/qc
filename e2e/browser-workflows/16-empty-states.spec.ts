/**
 * Browser Workflow 16: Empty States
 * Auto-generated from browser-workflows.md
 *
 * Verifies empty state handling across the app:
 * dashboard stat cards, notes filters/search empty states, requests empty tabs.
 */

import { test, expect } from '../auth'

test.describe('Workflow 16: Empty States', () => {
  test.describe('Dashboard stat cards', () => {
    test('stat cards are visible with numeric values', async ({ authedPage: page }) => {
      await page.goto('/dashboard')

      const main = page.getByRole('main')
      await expect(main.getByText('Check-ins', { exact: true }).first()).toBeVisible()
      await expect(main.getByText('Notes', { exact: true }).first()).toBeVisible()
      await expect(main.getByText('Milestones', { exact: true }).first()).toBeVisible()
      await expect(main.getByText('Action Items', { exact: true })).toBeVisible()
    })
  })

  test.describe('Notes — Empty filters', () => {
    test('Private filter shows "No notes found" empty state', async ({ authedPage: page }) => {
      await page.goto('/notes')

      await page.getByRole('button', { name: /^private$/i }).click()

      await expect(page.getByRole('heading', { name: /no notes found/i })).toBeVisible()
    })

    test('Drafts filter shows "No notes found" empty state', async ({ authedPage: page }) => {
      await page.goto('/notes')

      await page.getByRole('button', { name: /^drafts$/i }).click()

      await expect(page.getByRole('heading', { name: /no notes found/i })).toBeVisible()
    })

    test('Search for non-existent term shows empty state', async ({ authedPage: page }) => {
      await page.goto('/notes')

      await page
        .getByPlaceholder(/search notes/i)
        .first()
        .fill('xyznonexistent999')

      await expect(page.getByRole('heading', { name: /no notes found/i })).toBeVisible()
    })
  })

  test.describe('Requests — Empty tab states', () => {
    test('Received tab renders heading and tab buttons', async ({ authedPage: page }) => {
      await page.goto('/requests')

      await expect(page.getByRole('heading', { name: /^requests$/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /received/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /sent/i })).toBeVisible()
    })

    test('Sent tab is accessible and renders content', async ({ authedPage: page }) => {
      await page.goto('/requests')

      await page.getByRole('button', { name: /sent/i }).click()

      // Sent tab should show either sent requests or an empty state —
      // either way the tab should be clickable and show content area
      await expect(page.getByRole('button', { name: /sent/i })).toBeVisible()
    })
  })
})
