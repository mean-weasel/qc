/**
 * Browser Workflow 4: Partner Invite Acceptance
 * Auto-generated from browser-workflows.md
 *
 * Verifies invite token validation, authenticated invite page rendering,
 * and unauthenticated redirect behavior.
 */

import { test, expect } from '../auth'
import { TEST_PENDING_INVITE } from '../fixtures'

test.describe('Workflow 4: Partner Invite Acceptance', () => {
  const validInviteUrl = `/invite/${TEST_PENDING_INVITE.token}`
  const invalidTokenUrl = '/invite/00000000-0000-4000-8000-000000000000'

  test('invalid invite token shows error', async ({ page }) => {
    await page.goto(invalidTokenUrl)

    await expect(page.getByRole('heading', { name: /invalid invite/i })).toBeVisible()
    await expect(page.getByText(/invalid.*check with your partner/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /go to login/i })).toBeVisible()
  })

  test('authenticated user sees invite details with accept button', async ({ inviteUserPage: page }) => {
    await page.goto(validInviteUrl)

    await expect(page.getByRole('heading', { name: /you have been invited/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /join as a couple/i })).toBeVisible()
  })

  test('unauthenticated access to invite URL redirects to login or signup', async ({ page }) => {
    await page.goto(validInviteUrl)

    // Middleware redirects to /login; invite page may redirect to /signup
    await page.waitForURL(/\/(login|signup)/, { timeout: 15000 })
    expect(page.url()).toMatch(/\/(login|signup)/)
  })
})
