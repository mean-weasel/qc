/**
 * Shared helpers for mobile browser workflow tests.
 *
 * Used by mobile-browser-workflows*.spec.ts files.
 */

import { expect, type Page } from '@playwright/test'

// iPhone 15 Pro viewport
export const MOBILE_VIEWPORT = { width: 393, height: 852 }

export const MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

/** Remove Next.js dev overlay if present (it blocks pointer events in mobile viewport) */
export async function dismissDevOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Remove the entire nextjs-portal element that intercepts pointer events
    document.querySelectorAll('nextjs-portal').forEach((el) => el.remove())
    // Also remove the dev overlay script container
    document.querySelectorAll('[data-nextjs-dev-overlay]').forEach((el) => el.remove())
  })
}

/** Verify no horizontal overflow at mobile viewport width */
export async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  })
  expect(overflow).toBe(false)
}

/** Verify all interactive elements meet 44px minimum touch target */
export async function assertTouchTargets(page: Page, tolerance = 43.5): Promise<void> {
  const results = await page.evaluate((minSize) => {
    const interactive = document.querySelectorAll(
      'a, button, input, select, textarea, [role="button"], [role="link"], [role="tab"]',
    )
    const failures: Array<{ tag: string; text: string; width: number; height: number }> = []
    for (const el of interactive) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue // hidden elements
      const text = (el as HTMLElement).innerText?.trim().slice(0, 30) || el.getAttribute('aria-label') || ''
      // Skip the "Skip to content" link — it's visually hidden
      if (text.toLowerCase().includes('skip to content')) continue
      if (rect.height < minSize || rect.width < minSize) {
        failures.push({ tag: el.tagName, text, width: Math.round(rect.width), height: Math.round(rect.height) })
      }
    }
    return failures
  }, tolerance)
  expect(results, `Touch targets below ${tolerance}px: ${JSON.stringify(results)}`).toHaveLength(0)
}

/** Verify inputs use 16px+ font (prevents iOS auto-zoom) */
export async function assertNoAutoZoom(page: Page): Promise<void> {
  const results = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, textarea, select')
    const failures: Array<{ tag: string; placeholder: string; fontSize: string }> = []
    for (const el of inputs) {
      const style = window.getComputedStyle(el)
      const fontSize = parseFloat(style.fontSize)
      if (fontSize < 16) {
        failures.push({
          tag: el.tagName,
          placeholder: el.getAttribute('placeholder') || '',
          fontSize: style.fontSize,
        })
      }
    }
    return failures
  })
  expect(results, `Inputs with font-size < 16px: ${JSON.stringify(results)}`).toHaveLength(0)
}
