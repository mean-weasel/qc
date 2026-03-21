'use client'

import { useCallback, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { getConsentStatus, setConsentStatus, type ConsentStatus } from '@/lib/cookie-consent'
import { trackCookieConsentResponded } from '@/lib/analytics'

function subscribeToConsent(callback: () => void): () => void {
  const handler = (): void => callback()
  window.addEventListener('cookie-consent-changed', handler)
  return () => window.removeEventListener('cookie-consent-changed', handler)
}

function getServerSnapshot(): ConsentStatus | null {
  return null
}

export function CookieConsent(): React.ReactNode {
  const getSnapshot = useCallback(() => getConsentStatus(), [])
  const status = useSyncExternalStore(subscribeToConsent, getSnapshot, getServerSnapshot)

  // null = server render, skip to avoid hydration mismatch
  if (status === null || status !== 'undecided') return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/50 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-gray-800/50 dark:bg-gray-900/95"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use cookies to understand how visitors interact with our site.{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setConsentStatus('declined')
              trackCookieConsentResponded(false)
            }}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Decline
          </button>
          <button
            onClick={() => {
              setConsentStatus('accepted')
              trackCookieConsentResponded(true)
            }}
            className="rounded-md bg-[hsl(var(--primary))] px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
