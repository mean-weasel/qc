import { test, expect } from './auth'

test.describe('Settings — Page structure', () => {
  test('renders heading', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible()
  })

  test('Profile, Relationship, Session Rules tab buttons visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('button', { name: /^profile$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^relationship$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^session rules$/i })).toBeVisible()
  })

  test('Profile tab is active by default', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('heading', { name: /^profile$/i })).toBeVisible()
  })
})

test.describe('Settings — Profile tab', () => {
  test('email field shows alice@test.com and is disabled', async ({ authedPage: page }) => {
    await page.goto('/settings')

    const emailInput = page.getByLabel(/^email$/i)
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveValue('alice@test.com')
    await expect(emailInput).toBeDisabled()
  })

  test('display name field is pre-filled with Alice', async ({ authedPage: page }) => {
    await page.goto('/settings')

    const nameInput = page.getByLabel(/display name/i)
    await expect(nameInput).toBeVisible()
    await expect(nameInput).toHaveValue('Alice')
  })

  test('avatar URL field is visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByLabel(/avatar url/i)).toBeVisible()
  })

  test('Save Profile button is visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('button', { name: /save profile/i })).toBeVisible()
  })
})

test.describe('Settings — Relationship tab', () => {
  test('shows couple name', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^relationship$/i }).click()

    await expect(page.getByText('Alice & Bob')).toBeVisible()
  })

  test('shows partner name', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^relationship$/i }).click()

    await expect(page.getByText('Bob', { exact: true })).toBeVisible()
  })

  test('Danger Zone section with Leave Couple button', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^relationship$/i }).click()

    await expect(page.getByRole('heading', { name: /danger zone/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /leave couple/i })).toBeVisible()
  })

  test('clicking Leave Couple shows Confirm/Cancel step', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^relationship$/i }).click()
    await page.getByRole('button', { name: /leave couple/i }).click()

    await expect(page.getByRole('button', { name: /confirm leave/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^cancel$/i })).toBeVisible()
  })

  test('clicking Cancel reverts to Leave Couple button', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^relationship$/i }).click()
    await page.getByRole('button', { name: /leave couple/i }).click()
    await page.getByRole('button', { name: /^cancel$/i }).click()

    await expect(page.getByRole('button', { name: /leave couple/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /confirm leave/i })).not.toBeVisible()
  })
})

test.describe('Settings — Session Rules tab', () => {
  test('renders Session Rules heading', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()

    await expect(page.getByRole('heading', { name: /session rules/i })).toBeVisible()
  })

  test('session duration input is visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()

    await expect(page.getByLabel(/session duration/i)).toBeVisible()
  })

  test('timeouts per partner input is visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()

    await expect(page.getByLabel(/timeouts per partner/i)).toBeVisible()
  })

  test('Allow Extensions checkbox is checked', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()

    await expect(page.getByRole('checkbox', { name: /allow extensions/i })).toBeChecked()
  })

  test('Warm-Up Questions checkbox is checked', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()

    await expect(page.getByRole('checkbox', { name: /warm-up questions/i })).toBeChecked()
  })

  test('Turn-Based Mode checkbox is unchecked', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()

    await expect(page.getByRole('checkbox', { name: /turn-based mode/i })).not.toBeChecked()
  })

  test('Save Session Rules button is visible', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()

    await expect(page.getByRole('button', { name: /save session rules/i })).toBeVisible()
  })
})

test.describe.serial('Settings — Saves', () => {
  test('saving profile with new display name shows success', async ({ authedPage: page }) => {
    await page.goto('/settings')

    const nameInput = page.getByRole('textbox', { name: /display name/i })
    await expect(nameInput).toBeVisible()
    await nameInput.clear()
    await nameInput.fill('Alice Test')
    await page.getByRole('button', { name: /save profile/i }).click()

    await expect(page.locator('[data-sonner-toast]', { hasText: 'Profile updated' })).toBeVisible({ timeout: 10000 })
  })

  test('restoring original display name succeeds', async ({ authedPage: page }) => {
    await page.goto('/settings')

    const nameInput = page.getByRole('textbox', { name: /display name/i })
    await expect(nameInput).toBeVisible()
    await nameInput.clear()
    await nameInput.fill('Alice')
    await page.getByRole('button', { name: /save profile/i }).click()

    await expect(page.locator('[data-sonner-toast]', { hasText: 'Profile updated' })).toBeVisible({ timeout: 10000 })
  })

  test('saving session rules shows success message', async ({ authedPage: page }) => {
    await page.goto('/settings')

    await page.getByRole('button', { name: /^session rules$/i }).click()
    // Wait for tab content to fully render before interacting
    await expect(page.getByRole('heading', { name: /session rules/i })).toBeVisible()
    await page.getByRole('button', { name: /save session rules/i }).click()

    await expect(page.getByText(/session settings saved/i)).toBeVisible({ timeout: 15000 })
  })
})
