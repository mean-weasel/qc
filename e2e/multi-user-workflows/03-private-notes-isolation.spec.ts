/**
 * Multi-User Workflow 03: Private Notes Isolation
 *
 * Tests that Partner A (Alice) creates a private note and Partner B (Bob) cannot see it.
 * Verifies RLS privacy enforcement across two browser contexts.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const ALICE = { email: 'alice@test.com', password: 'password123' }
const BOB = { email: 'bob@test.com', password: 'password123' }
const PRIVATE_NOTE_CONTENT = `Private isolation test — ${Date.now()}`

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
}

async function createContextAndPage(browser: {
  newContext: () => Promise<BrowserContext>
}): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext()
  const page = await context.newPage()
  return { context, page }
}

async function deleteTestNote(page: Page, content: string): Promise<void> {
  await page.goto('/notes')
  const noteCards = page.getByRole('button').filter({ hasText: content })
  const count = await noteCards.count()
  if (count > 0) {
    await noteCards.first().hover()
    const deleteBtn = page.getByLabel(/delete note/i).first()
    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteBtn.click()
      await page.waitForTimeout(1000)
    }
  }
}

test.describe.serial('Multi-User: Private Notes Isolation', () => {
  let aliceContext: BrowserContext
  let bobContext: BrowserContext
  let alicePage: Page
  let bobPage: Page

  test.beforeAll(async ({ browser }) => {
    const alice = await createContextAndPage(browser)
    const bob = await createContextAndPage(browser)
    aliceContext = alice.context
    bobContext = bob.context
    alicePage = alice.page
    bobPage = bob.page

    await Promise.all([login(alicePage, ALICE.email, ALICE.password), login(bobPage, BOB.email, BOB.password)])
  })

  test.afterAll(async () => {
    // Clean up the private test note
    await deleteTestNote(alicePage, PRIVATE_NOTE_CONTENT)
    await aliceContext.close()
    await bobContext.close()
  })

  test('Bob navigates to /notes and records baseline', async () => {
    await bobPage.goto('/notes')
    await expect(bobPage.getByRole('heading', { name: /^notes$/i })).toBeVisible()
  })

  test('Alice creates a private note', async () => {
    await alicePage.goto('/notes')

    // Open New Note modal
    await alicePage.getByRole('button', { name: /new note/i }).click()
    await expect(alicePage.getByRole('heading', { name: /new note/i })).toBeVisible()

    // Type content
    await alicePage.getByPlaceholder(/what's on your mind/i).fill(PRIVATE_NOTE_CONTENT)

    // Click "Private" in the privacy selector (scoped to dialog to avoid page filter pill)
    await alicePage.getByRole('dialog').getByText('Private', { exact: true }).click()

    // Click Save (inside dialog) and wait for server response
    const saveBtn = alicePage.getByRole('dialog').getByRole('button', { name: /^save$/i })
    await expect(saveBtn).toBeEnabled()
    const [response] = await Promise.all([
      alicePage.waitForResponse((resp) => resp.request().method() === 'POST' && resp.status() === 200, {
        timeout: 15000,
      }),
      saveBtn.click(),
    ])
    expect(response.ok()).toBeTruthy()
  })

  test('Alice sees the private note with Private badge', async () => {
    await alicePage.goto('/notes')

    // Verify the private note appears for Alice
    await expect(alicePage.getByText(PRIVATE_NOTE_CONTENT).first()).toBeVisible({ timeout: 15000 })

    // Verify it has the Private badge
    await alicePage.getByRole('button', { name: /^private$/i }).click()
    await expect(alicePage.getByText(PRIVATE_NOTE_CONTENT).first()).toBeVisible({ timeout: 15000 })
  })

  test('Bob does NOT see the private note', async () => {
    // Reload Bob's page to fetch fresh data
    await bobPage.goto('/notes')
    await expect(bobPage.getByRole('heading', { name: /^notes$/i })).toBeVisible()

    // Wait for notes to load
    await bobPage.waitForLoadState('networkidle')

    // Verify Alice's private note is NOT visible to Bob
    await expect(bobPage.getByText(PRIVATE_NOTE_CONTENT)).not.toBeVisible({ timeout: 5000 })
  })
})
