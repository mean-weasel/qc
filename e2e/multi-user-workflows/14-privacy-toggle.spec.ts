/**
 * Multi-User Workflow 14: Privacy Toggle
 *
 * Tests that when Partner A changes a shared note to private,
 * Partner B loses visibility of that note.
 *
 * Uses the `browser` fixture to create two independent browser contexts
 * (Alice and Bob) with separate auth sessions.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const ALICE = { email: 'alice@test.com', password: 'password123' }
const BOB = { email: 'bob@test.com', password: 'password123' }

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
}

async function createContext(browser: { newContext: () => Promise<BrowserContext> }): Promise<{
  context: BrowserContext
  page: Page
}> {
  const context = await browser.newContext()
  const page = await context.newPage()
  return { context, page }
}

/** Create a new shared note with the given content */
async function createSharedNote(page: Page, content: string): Promise<void> {
  await page.goto('/notes')
  await page.getByRole('button', { name: /new note/i }).click()

  // Ensure "Shared" privacy is selected (default)
  await page.getByPlaceholder(/what's on your mind/i).fill(content)
  await expect(page.getByRole('button', { name: /^save$/i })).toBeEnabled()

  // Click save and wait for server response
  const [response] = await Promise.all([
    page.waitForResponse((resp) => resp.request().method() === 'POST' && resp.status() === 200, { timeout: 15000 }),
    page.getByRole('button', { name: /^save$/i }).click(),
  ])
  expect(response.ok()).toBeTruthy()
}

/** Change an existing note's privacy to "Private" via the edit modal */
async function changeNoteToPrivate(page: Page, content: string): Promise<void> {
  await page.goto('/notes')

  // Click the note card to open the Edit Note modal
  await page.getByRole('button').filter({ hasText: content }).first().click()
  await expect(page.getByRole('heading', { name: /edit note/i })).toBeVisible()

  // Click "Private" in the privacy selector
  const privacySelector = page.locator('.flex.gap-1.rounded-lg')
  await privacySelector.getByText('Private', { exact: true }).click()

  // Click Update and wait for server response
  const [response] = await Promise.all([
    page.waitForResponse((resp) => resp.request().method() === 'POST' && resp.status() === 200, { timeout: 15000 }),
    page.getByRole('button', { name: /^update$/i }).click(),
  ])
  expect(response.ok()).toBeTruthy()
}

/** Verify a note with the given content is visible on /notes */
async function verifyNoteVisible(page: Page, content: string): Promise<void> {
  await page.goto('/notes')
  await page.reload()
  await expect(page.getByText(content).first()).toBeVisible({ timeout: 15000 })
}

/** Verify a note with the given content is NOT visible on /notes */
async function verifyNoteNotVisible(page: Page, content: string): Promise<void> {
  await page.goto('/notes')
  await page.reload()
  await expect(page.getByText(content)).not.toBeVisible({ timeout: 15000 })
}

/** Verify the note shows a "Private" badge on /notes */
async function verifyPrivateBadge(page: Page, content: string): Promise<void> {
  await page.goto('/notes')
  const noteCard = page.getByRole('button').filter({ hasText: content }).first()
  await expect(noteCard).toBeVisible({ timeout: 15000 })

  // The note card should contain a "Private" privacy badge
  await expect(noteCard.getByText('Private', { exact: true })).toBeVisible()
}

/** Clean up test note by deleting it */
async function deleteNote(page: Page, content: string): Promise<void> {
  await page.goto('/notes')
  const noteCard = page.getByRole('button').filter({ hasText: content })
  const count = await noteCard.count()
  if (count === 0) return

  await noteCard.first().hover()
  await page
    .getByLabel(/delete note/i)
    .first()
    .click()
}

test.describe.serial('Workflow 14: Privacy Toggle — shared to private hides from partner', () => {
  const noteContent = `Privacy toggle test note ${Date.now()}`

  test('Alice creates shared note, Bob sees it, Alice makes it private, Bob loses access', async ({ browser }) => {
    // Set up two independent browser contexts
    const alice = await createContext(browser)
    const bob = await createContext(browser)

    try {
      // Step 1: Both users log in
      await login(alice.page, ALICE.email, ALICE.password)
      await login(bob.page, BOB.email, BOB.password)

      // Step 2: Alice creates a new shared note
      await createSharedNote(alice.page, noteContent)

      // Step 3: Verify Alice can see the note
      await verifyNoteVisible(alice.page, noteContent)

      // Step 4: Bob navigates to /notes and verifies the shared note is visible
      await verifyNoteVisible(bob.page, noteContent)

      // Step 5-7: Alice opens the note, changes privacy to Private, saves
      await changeNoteToPrivate(alice.page, noteContent)

      // Step 8: Alice verifies the note now shows a Private badge
      await verifyPrivateBadge(alice.page, noteContent)

      // Step 9: Bob reloads /notes and verifies the note is NO LONGER visible
      await verifyNoteNotVisible(bob.page, noteContent)

      // Cleanup: Alice deletes the test note
      await deleteNote(alice.page, noteContent)
    } finally {
      await alice.context.close()
      await bob.context.close()
    }
  })
})
