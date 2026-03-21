// Server-side PostHog analytics via posthog-node
// Used in server actions where posthog-js is not available

import { PostHog } from 'posthog-node'

let _client: PostHog | null = null

function getClient(): PostHog | null {
  if (_client) return _client
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null
  _client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  })
  return _client
}

export function serverTrackWaitlistSignupCompleted(email: string, source: string): void {
  getClient()?.capture({
    distinctId: email,
    event: 'waitlist_signup_completed',
    properties: { source },
  })
}

export function serverTrackWaitlistSignupFailed(email: string, reason: string): void {
  getClient()?.capture({
    distinctId: email,
    event: 'waitlist_signup_failed',
    properties: { reason },
  })
}
