/**
 * Browser Workflow 1: Landing Page Experience
 * Auto-generated from browser-workflows.md
 *
 * Verifies the unauthenticated landing page renders correctly:
 * hero section, feature grid, how it works, social proof, footer, and responsive layout.
 */

import { test, expect } from '@playwright/test'

test.describe('Workflow 1: Landing Page Experience', () => {
  test.describe('Hero Section', () => {
    test('renders heading with brand text', async ({ page }) => {
      await page.goto('/')

      await expect(page.getByRole('heading', { name: /quality control/i })).toBeVisible()
      await expect(page.getByText(/for your relationship/i).first()).toBeVisible()
    })

    test('renders CTA buttons', async ({ page }) => {
      await page.goto('/')

      await expect(page.getByRole('link', { name: /start your journey/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /learn more/i })).toBeVisible()
    })

    test('renders feature pills', async ({ page }) => {
      await page.goto('/')

      await expect(page.getByText('Structured Sessions')).toBeVisible()
      await expect(page.getByText('Relationship Reminders').first()).toBeVisible()
      await expect(page.getByText('Progress Tracking').first()).toBeVisible()
    })
  })

  test.describe('Feature Grid Section', () => {
    test('renders section heading', async ({ page }) => {
      await page.goto('/')

      await expect(page.getByRole('heading', { name: /for lovers who like/i })).toBeVisible()
    })

    test('renders all 9 feature cards', async ({ page }) => {
      await page.goto('/')

      await expect(page.getByText('Guided Check-ins')).toBeVisible()
      await expect(page.getByText('Session Rules')).toBeVisible()
      await expect(page.getByText('Relationship Reminders').first()).toBeVisible()
      await expect(page.getByText('Pattern Recognition')).toBeVisible()
      await expect(page.getByText('Progress Metrics')).toBeVisible()
      await expect(page.getByText('Privacy First')).toBeVisible()
      await expect(page.getByText('Unified View')).toBeVisible()
      await expect(page.getByText('Action Items')).toBeVisible()
      await expect(page.getByText('Relationship Goals')).toBeVisible()
    })
  })

  test.describe('How It Works & Social Proof', () => {
    test('renders How It Works section with 3 steps', async ({ page }) => {
      await page.goto('/')

      await expect(page.getByRole('heading', { name: /how it works/i })).toBeVisible()
      await expect(page.getByText(/sign up & invite your partner/i)).toBeVisible()
      await expect(page.getByText(/check in together/i)).toBeVisible()
      await expect(page.getByText(/track your growth/i)).toBeVisible()
    })

    test('renders social proof trust signals', async ({ page }) => {
      await page.goto('/')

      await expect(page.getByText('Built for couples')).toBeVisible()
      await expect(page.getByText('Privacy-first design')).toBeVisible()
      await expect(page.getByText('Free to start')).toBeVisible()
      await expect(page.getByText('No data selling, ever')).toBeVisible()
    })
  })

  test.describe('CTA Navigation', () => {
    test('Start your journey CTA navigates to /signup', async ({ page }) => {
      await page.goto('/')

      const cta = page.getByRole('link', { name: /start your journey/i })
      await expect(cta).toHaveAttribute('href', '/signup')
    })

    test('Sign In link navigates to /login', async ({ page }) => {
      await page.goto('/')

      const signInLink = page.getByRole('navigation').getByRole('link', { name: /sign in/i })
      await expect(signInLink).toBeVisible()
      await expect(signInLink).toHaveAttribute('href', '/login')
    })

    test('Sign Up link navigates to /signup', async ({ page }) => {
      await page.goto('/')

      const signUpLink = page.getByRole('navigation').getByRole('link', { name: /sign up/i })
      await expect(signUpLink).toBeVisible()
      await expect(signUpLink).toHaveAttribute('href', '/signup')
    })
  })

  test.describe('Responsive Layout', () => {
    test('renders correctly at 375px mobile width', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto('/')

      await expect(page.getByRole('heading', { name: /quality control/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /start your journey/i })).toBeVisible()
      await expect(page.getByRole('navigation').getByRole('link', { name: /sign in/i })).toBeVisible()
    })

    test('renders correctly at 1280px desktop width', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/')

      await expect(page.getByRole('heading', { name: /quality control/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /start your journey/i })).toBeVisible()
      await expect(page.getByRole('navigation').getByRole('link', { name: /sign in/i })).toBeVisible()
    })
  })

  test.describe('Footer', () => {
    test('renders QC branding', async ({ page }) => {
      await page.goto('/')

      const footer = page.locator('footer')
      await expect(footer).toBeVisible()
      await expect(footer.getByText('QC', { exact: true })).toBeVisible()
    })

    test('has Privacy Policy link to /privacy', async ({ page }) => {
      await page.goto('/')

      const privacyLink = page.locator('footer').getByRole('link', { name: /privacy policy/i })
      await expect(privacyLink).toBeVisible()
      await expect(privacyLink).toHaveAttribute('href', '/privacy')
    })

    test('has Terms of Service link to /terms', async ({ page }) => {
      await page.goto('/')

      const termsLink = page.locator('footer').getByRole('link', { name: /terms of service/i })
      await expect(termsLink).toBeVisible()
      await expect(termsLink).toHaveAttribute('href', '/terms')
    })
  })
})
