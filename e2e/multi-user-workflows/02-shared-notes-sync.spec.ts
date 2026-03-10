/**
 * Multi-User Workflow 02: Shared Notes Sync
 *
 * Tests that Partner A (Alice) creates a shared note and Partner B (Bob) can see it.
 * Uses two independent browser contexts for simultaneous sessions.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const ALICE = { email: 'alice@test.com', password: 'password123' }
const BOB = { email: 'bob@test.com', password: 'password123' }
const NOTE_CONTENT = `Shared note sync test — ${Date.now()}`

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

test.describe.serial('Multi-User: Shared Notes Sync', () => {
  let aliceContext: BrowserContext
  let bobContext: BrowserContext
  let alicePage: Page
  let bobPage: Page

  test.beforeAll(async ({ browser }) => {
    // Create two independent browser contexts
    const alice = await createContextAndPage(browser)
    const bob = await createContextAndPage(browser)
    aliceContext = alice.context
    bobContext = bob.context
    alicePage = alice.page
    bobPage = bob.page

    // Log in both users in parallel
    await Promise.all([login(alicePage, ALICE.email, ALICE.password), login(bobPage, BOB.email, BOB.password)])
  })

  test.afterAll(async () => {
    // Clean up the test note
    await deleteTestNote(alicePage, NOTE_CONTENT)
    await aliceContext.close()
    await bobContext.close()
  })

  test('Alice creates a shared note', async () => {
    // Navigate Alice to /notes
    await alicePage.goto('/notes')
    await expect(alicePage.getByRole('heading', { name: /^notes$/i })).toBeVisible()

    // Click New Note button
    await alicePage.getByRole('button', { name: /new note/i }).click()
    await expect(alicePage.getByRole('heading', { name: /new note/i })).toBeVisible()

    // Type test content in textarea
    await alicePage.getByPlaceholder(/what's on your mind/i).fill(NOTE_CONTENT)

    // Shared privacy is the default -- verify it is selected
    const sharedOption = alicePage.getByText('Shared', { exact: true }).first()
    await expect(sharedOption).toBeVisible()

    // Click Save and wait for server response
    await expect(alicePage.getByRole('button', { name: /^save$/i })).toBeEnabled()
    const [response] = await Promise.all([
      alicePage.waitForResponse((resp) => resp.request().method() === 'POST' && resp.status() === 200, {
        timeout: 15000,
      }),
      alicePage.getByRole('button', { name: /^save$/i }).click(),
    ])
    expect(response.ok()).toBeTruthy()
  })

  test('Alice sees the note after reload', async () => {
    // Reload to verify note persisted
    await alicePage.goto('/notes')
    await expect(alicePage.getByText(NOTE_CONTENT).first()).toBeVisible({ timeout: 15000 })
  })

  test('Bob sees the shared note after reload', async () => {
    // Navigate Bob to /notes
    await bobPage.goto('/notes')
    await expect(bobPage.getByRole('heading', { name: /^notes$/i })).toBeVisible()

    // Verify Alice's shared note appears in Bob's list
    await expect(bobPage.getByText(NOTE_CONTENT).first()).toBeVisible({ timeout: 15000 })
  })
})
