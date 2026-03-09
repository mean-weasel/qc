/**
 * Browser Workflow 13: Requests
 *
 * Auto-generated from browser-workflows.md
 * Tests the Requests page including heading, Received/Sent tabs, New Request form,
 * and tab switching behavior.
 */

import { test, expect } from '../auth'

test.describe('Workflow 13: Requests — Page structure', () => {
  test('renders heading', async ({ authedPage: page }) => {
    await page.goto('/requests')

    await expect(page.getByRole('heading', { name: /^requests$/i })).toBeVisible({ timeout: 15000 })
  })

  test('Received and Sent tabs visible', async ({ authedPage: page }) => {
    await page.goto('/requests')

    await expect(page.getByRole('button', { name: /received/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sent/i })).toBeVisible()
  })

  test('New Request button visible', async ({ authedPage: page }) => {
    await page.goto('/requests')

    await expect(page.getByRole('button', { name: /new request/i })).toBeVisible()
  })
})

test.describe('Workflow 13: Requests — New Request form', () => {
  test('clicking New Request reveals form with heading', async ({ authedPage: page }) => {
    await page.goto('/requests')

    const newRequestBtn = page.getByRole('button', { name: /new request/i })
    await expect(newRequestBtn).toBeEnabled({ timeout: 15000 })
    await newRequestBtn.click()

    await expect(page.getByRole('heading', { name: /new request for bob/i })).toBeVisible()
  })

  test('form shows title, description, category, priority, suggested date inputs', async ({ authedPage: page }) => {
    await page.goto('/requests')

    const newRequestBtn = page.getByRole('button', { name: /new request/i })
    await expect(newRequestBtn).toBeEnabled({ timeout: 15000 })
    await newRequestBtn.click()

    await expect(page.getByLabel(/title/i).first()).toBeVisible()
    await expect(page.getByLabel(/description/i)).toBeVisible()
    await expect(page.getByLabel(/category/i)).toBeVisible()
    await expect(page.getByLabel(/priority/i)).toBeVisible()
    await expect(page.getByLabel(/suggested date/i)).toBeVisible()
  })

  test('form shows Send Request submit button', async ({ authedPage: page }) => {
    await page.goto('/requests')

    const newRequestBtn = page.getByRole('button', { name: /new request/i })
    await expect(newRequestBtn).toBeEnabled({ timeout: 15000 })
    await newRequestBtn.click()

    await expect(page.getByRole('button', { name: /send request/i })).toBeVisible()
  })

  test('clicking Cancel hides the form', async ({ authedPage: page }) => {
    await page.goto('/requests')

    const newRequestBtn = page.getByRole('button', { name: /new request/i })
    await expect(newRequestBtn).toBeEnabled({ timeout: 15000 })
    await newRequestBtn.click()
    await expect(page.getByRole('heading', { name: /new request for bob/i })).toBeVisible()

    // The button toggles between "New Request" and "Cancel"
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('heading', { name: /new request for bob/i })).not.toBeVisible()
  })
})

test.describe('Workflow 13: Requests — Tab switching', () => {
  test('clicking Sent tab shows sent requests', async ({ authedPage: page }) => {
    await page.goto('/requests')

    await page.getByRole('button', { name: /sent/i }).click()

    await expect(page.getByText(/talk about summer travel/i)).toBeVisible({ timeout: 10000 })
  })

  test('clicking Received tab shows received requests', async ({ authedPage: page }) => {
    await page.goto('/requests')

    // Switch to Sent first
    await page.getByRole('button', { name: /sent/i }).click()
    await expect(page.getByText(/talk about summer travel/i)).toBeVisible({ timeout: 10000 })

    // Switch back to Received
    await page.getByRole('button', { name: /received/i }).click()

    await expect(page.getByText(/plan a surprise date night/i).first()).toBeVisible({ timeout: 10000 })
  })
})
