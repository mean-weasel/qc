'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getConsentStatus } from '@/lib/cookie-consent'
import { registerPostHog } from '@/lib/analytics'

const POSTHOG_CONFIG = {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: true,
  persistence: 'memory' as const,
  disable_session_recording: true,
}

function initPostHog(withConsent: boolean): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    ...POSTHOG_CONFIG,
    ...(withConsent ? { persistence: 'localStorage+cookie' as const } : {}),
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.debug()
      }
      const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV
      ph.register({ environment: vercelEnv })
      registerPostHog(ph as unknown as typeof posthog)
    },
  })
}

function PostHogPageView(): null {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname
      const search = searchParams.toString()
      if (search) {
        url += '?' + search
      }
      posthog.capture('$pageview', { $current_url: url })
    }
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  useEffect(() => {
    const consent = getConsentStatus()
    initPostHog(consent === 'accepted')

    function handleConsentChange(e: Event): void {
      const detail = (e as CustomEvent).detail
      if (detail.status === 'accepted') {
        if (posthog.__loaded) {
          posthog.opt_in_capturing()
          posthog.set_config({ persistence: 'localStorage+cookie' })
        } else {
          initPostHog(true)
        }
      } else if (detail.status === 'declined' || detail.status === 'undecided') {
        if (posthog.__loaded) {
          posthog.set_config({ persistence: 'memory' })
          posthog.reset()
        }
      }
    }

    window.addEventListener('cookie-consent-changed', handleConsentChange)
    return () => window.removeEventListener('cookie-consent-changed', handleConsentChange)
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
