// Client-side PostHog analytics
// All events are no-ops if PostHog is not loaded (e.g., dev without env vars)

let _posthog: typeof import('posthog-js').default | null = null

export function registerPostHog(instance: typeof import('posthog-js').default): void {
  _posthog = instance
}

function isPostHogAvailable(): boolean {
  return typeof window !== 'undefined' && _posthog !== null && _posthog.__loaded === true
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (!isPostHogAvailable()) return
  _posthog!.capture(eventName, params)
}

// --- Landing page events ---

export function trackLandingViewed(): void {
  const params = new URLSearchParams(window.location.search)
  trackEvent('landing_viewed', {
    referrer: document.referrer || 'direct',
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  })
}

const SCROLL_THRESHOLDS = [25, 50, 75, 100]
const firedThresholds = new Set<number>()

export function trackLandingScrolled(depthPercent: number): void {
  for (const threshold of SCROLL_THRESHOLDS) {
    if (depthPercent >= threshold && !firedThresholds.has(threshold)) {
      firedThresholds.add(threshold)
      trackEvent('landing_scrolled', { depth_percent: threshold })
    }
  }
}

export function initScrollDepthTracking(): () => void {
  firedThresholds.clear()
  function handleScroll(): void {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    if (scrollHeight <= 0) return
    const depth = Math.round((window.scrollY / scrollHeight) * 100)
    trackLandingScrolled(depth)
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
  return () => window.removeEventListener('scroll', handleScroll)
}

export function trackCtaClicked(ctaLocation: string, ctaText: string): void {
  trackEvent('cta_clicked', { cta_location: ctaLocation, cta_text: ctaText })
}

// --- Waitlist events ---

export function trackWaitlistFormViewed(source?: string): void {
  trackEvent('waitlist_form_viewed', { source })
}

export function trackWaitlistSignupAttempted(): void {
  trackEvent('waitlist_signup_attempted')
}

// --- Cookie consent ---

export function trackCookieConsentResponded(accepted: boolean): void {
  trackEvent('cookie_consent_responded', { accepted })
}
