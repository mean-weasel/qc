import { describe, it, expect, beforeEach, vi } from 'vitest'

import { registerPostHog, trackEvent, trackLandingViewed, trackCtaClicked, trackWaitlistFormViewed } from './analytics'

function createMockPostHog() {
  return {
    __loaded: true,
    capture: vi.fn(),
  }
}

describe('analytics', () => {
  beforeEach(() => {
    registerPostHog(null as unknown as never)
  })

  it('trackEvent is a no-op when PostHog is not registered', () => {
    trackEvent('test_event', { foo: 'bar' })
  })

  it('trackEvent captures when PostHog is registered', () => {
    const mock = createMockPostHog()
    registerPostHog(mock as unknown as never)
    trackEvent('test_event', { foo: 'bar' })
    expect(mock.capture).toHaveBeenCalledWith('test_event', { foo: 'bar' })
  })

  it('trackLandingViewed captures with UTM params', () => {
    const mock = createMockPostHog()
    registerPostHog(mock as unknown as never)
    trackLandingViewed()
    expect(mock.capture).toHaveBeenCalledWith(
      'landing_viewed',
      expect.objectContaining({
        referrer: expect.any(String),
      }),
    )
  })

  it('trackCtaClicked captures with location and text', () => {
    const mock = createMockPostHog()
    registerPostHog(mock as unknown as never)
    trackCtaClicked('hero', 'Start your journey')
    expect(mock.capture).toHaveBeenCalledWith('cta_clicked', {
      cta_location: 'hero',
      cta_text: 'Start your journey',
    })
  })

  it('trackWaitlistFormViewed captures with source', () => {
    const mock = createMockPostHog()
    registerPostHog(mock as unknown as never)
    trackWaitlistFormViewed('signup_page')
    expect(mock.capture).toHaveBeenCalledWith('waitlist_form_viewed', { source: 'signup_page' })
  })
})
