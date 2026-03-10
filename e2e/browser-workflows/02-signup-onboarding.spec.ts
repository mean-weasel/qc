/**
 * Browser Workflow 2: Signup & Onboarding
 * Auto-generated from browser-workflows.md
 *
 * Verifies the signup page renders correctly and the onboarding flow
 * is accessible for users without a couple.
 */

import { test as unauthTest, expect as unauthExpect } from '@playwright/test'
import { test, expect } from '../auth'

unauthTest.describe('Workflow 2: Signup Page (unauthenticated)', () => {
  unauthTest('renders with display name, email, and password fields', async ({ page }) => {
    await page.goto('/signup')

    await unauthExpect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
    await unauthExpect(page.getByLabel(/display name/i)).toBeVisible()
    await unauthExpect(page.getByLabel(/email/i)).toBeVisible()
    await unauthExpect(page.getByLabel(/password/i)).toBeVisible()
  })

  unauthTest('renders OAuth buttons for Google and GitHub', async ({ page }) => {
    // OAuth buttons are on the login page, not the signup page
    await page.goto('/login')

    await unauthExpect(page.getByRole('button', { name: /google/i })).toBeVisible()
    await unauthExpect(page.getByRole('button', { name: /github/i })).toBeVisible()
  })

  unauthTest('create account button shows loading state on submit', async ({ page }) => {
    await page.goto('/signup')

    await page.getByLabel(/display name/i).fill('Test User')
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('testpassword123')
    await page.getByRole('button', { name: /create account/i }).click()

    // The button text should change to a loading state while submitting
    await unauthExpect(page.getByRole('button', { name: /creating/i })).toBeVisible()
  })

  unauthTest('has link to login page', async ({ page }) => {
    await page.goto('/signup')

    const loginLink = page.getByRole('link', { name: /sign in/i })
    await unauthExpect(loginLink).toBeVisible()
    await unauthExpect(loginLink).toHaveAttribute('href', /^\/login\/?$/)
  })
})

test.describe('Workflow 2: Onboarding (user without couple)', () => {
  test('onboarding page renders for user without couple', async ({ noCoupleAuthedPage: page }) => {
    await expect(page.getByRole('heading', { name: /welcome to qc/i })).toBeVisible()
  })

  test('shows progress indicator with step bars', async ({ noCoupleAuthedPage: page }) => {
    // The step indicator renders progress bars for each onboarding step
    const stepBars = page.locator('.rounded-full.h-2')
    await expect(stepBars).toHaveCount(7)
  })

  test('step 1 shows display name field', async ({ noCoupleAuthedPage: page }) => {
    await expect(page.getByLabel(/your display name/i)).toBeVisible()
    await expect(page.getByPlaceholder(/how should your partner see you/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible()
  })
})
