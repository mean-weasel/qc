import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('posthog-node', () => {
  const capture = vi.fn()
  return {
    PostHog: vi.fn().mockImplementation(function () {
      return { capture }
    }),
    __mockCapture: capture,
  }
})

describe('analytics-server', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY
  })

  it('serverTrackWaitlistSignupCompleted captures event', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'
    const mod = await import('./analytics-server')
    const phMod = await import('posthog-node')
    mod.serverTrackWaitlistSignupCompleted('test@example.com', 'landing')
    expect((phMod as unknown as { __mockCapture: ReturnType<typeof vi.fn> }).__mockCapture).toHaveBeenCalledWith({
      distinctId: 'test@example.com',
      event: 'waitlist_signup_completed',
      properties: { source: 'landing' },
    })
  })
})
