/**
 * Multi-User Workflow 05: Partner Requests
 *
 * Tests that Partner A (Alice) sends a request, Partner B (Bob) sees it
 * in his Received tab, and can accept it.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const ALICE = { email: 'alice@test.com', password: 'password123' }
const BOB = { email: 'bob@test.com', password: 'password123' }
const REQUEST_TITLE = `E2E test request — ${Date.now()}`
const REQUEST_DESCRIPTION = 'Automated multi-user test description'

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

/** Delete any test requests matching the title via Supabase REST API */
async function cleanupTestRequests(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!serviceKey) return
  const headers = {
    'Content-Type': 'application/json',
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  }
  await fetch(`${supabaseUrl}/rest/v1/requests?title=like.E2E test request*`, {
    method: 'DELETE',
    headers,
  })
}

test.describe.serial('Multi-User: Partner Requests', () => {
  let aliceContext: BrowserContext
  let bobContext: BrowserContext
  let alicePage: Page
  let bobPage: Page

  test.beforeAll(async ({ browser }) => {
    await cleanupTestRequests()

    const alice = await createContextAndPage(browser)
    const bob = await createContextAndPage(browser)
    aliceContext = alice.context
    bobContext = bob.context
    alicePage = alice.page
    bobPage = bob.page

    await Promise.all([login(alicePage, ALICE.email, ALICE.password), login(bobPage, BOB.email, BOB.password)])
  })

  test.afterAll(async () => {
    await cleanupTestRequests()
    await aliceContext.close()
    await bobContext.close()
  })

  test('Alice sends a new request to Bob', async () => {
    await alicePage.goto('/requests')

    // Click New Request button
    const newRequestBtn = alicePage.getByRole('button', { name: /new request/i })
    await expect(newRequestBtn).toBeEnabled({ timeout: 15000 })
    await newRequestBtn.click()

    // Fill in the request form
    await alicePage.getByLabel(/title/i).first().fill(REQUEST_TITLE)
    await alicePage.getByLabel(/description/i).fill(REQUEST_DESCRIPTION)

    // Submit the form and wait for POST response
    const [response] = await Promise.all([
      alicePage.waitForResponse((resp) => resp.request().method() === 'POST' && resp.status() === 200, {
        timeout: 15000,
      }),
      alicePage.getByRole('button', { name: /send request/i }).click(),
    ])
    expect(response.ok()).toBeTruthy()

    // Form should close after successful creation
    await expect(alicePage.getByRole('heading', { name: /new request for bob/i })).not.toBeVisible({
      timeout: 15000,
    })
  })

  test('Alice sees the request in her Sent tab', async () => {
    await alicePage.goto('/requests')
    await alicePage.getByRole('button', { name: /sent/i }).click()

    await expect(alicePage.getByText(REQUEST_TITLE).first()).toBeVisible({ timeout: 15000 })
  })

  test('Bob sees the request in his Received tab', async () => {
    // Reload Bob's page to fetch fresh data
    await bobPage.goto('/requests')

    // Received tab is the default
    await expect(bobPage.getByText(REQUEST_TITLE).first()).toBeVisible({ timeout: 15000 })
  })

  test('Bob accepts the request', async () => {
    await bobPage.goto('/requests')

    // Find the request card and click Accept
    await expect(bobPage.getByText(REQUEST_TITLE).first()).toBeVisible({ timeout: 15000 })

    // Click Accept on the card containing the test request
    const card = bobPage.locator('.rounded-lg.border').filter({ hasText: REQUEST_TITLE }).first()
    await card.getByRole('button', { name: /accept/i }).click()

    // Verify status changed to accepted
    await expect(bobPage.getByText('accepted', { exact: true }).first()).toBeVisible({ timeout: 15000 })
  })

  test('Alice sees the request status changed to accepted', async () => {
    // Reload Alice's page to fetch fresh data
    await alicePage.goto('/requests')
    await alicePage.getByRole('button', { name: /sent/i }).click()

    // Find the test request card and verify accepted status
    await expect(alicePage.getByText(REQUEST_TITLE).first()).toBeVisible({ timeout: 15000 })
    const card = alicePage.locator('.rounded-lg.border').filter({ hasText: REQUEST_TITLE }).first()
    await expect(card.getByText('accepted', { exact: true })).toBeVisible({ timeout: 15000 })
  })
})
