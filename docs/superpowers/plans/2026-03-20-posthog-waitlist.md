# PostHog + Waitlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PostHog analytics for landing/waitlist funnel tracking and a waitlist signup flow gated by `ALLOWED_EMAILS`, with confirmation emails via Resend.

**Architecture:** Consent-first PostHog (memory persistence by default, upgrade on cookie accept). Hard beta gate on signup — non-allowed emails see a waitlist form instead of the signup form. Waitlist entries stored in Supabase + synced to a Resend audience. Server-side PostHog via `posthog-node` for tracking waitlist server actions.

**Tech Stack:** posthog-js, posthog-node, Resend contacts API, Supabase (new `waitlist` table), React Email, Zod

**Spec:** `docs/superpowers/specs/2026-03-20-posthog-waitlist-design.md`

---

## File Structure

| File                                                | Action | Responsibility                                            |
| --------------------------------------------------- | ------ | --------------------------------------------------------- |
| `src/lib/cookie-consent.ts`                         | Create | Cookie consent state: get/set/clear, CustomEvent dispatch |
| `src/components/PostHogProvider.tsx`                | Create | PostHog init with consent-based persistence               |
| `src/components/PostHogWrapper.tsx`                 | Create | Dynamic import wrapper (SSR-disabled)                     |
| `src/components/ui/CookieConsent.tsx`               | Create | Cookie consent banner UI                                  |
| `src/lib/analytics.ts`                              | Create | Client-side analytics event functions                     |
| `src/lib/analytics-server.ts`                       | Create | Server-side PostHog client (posthog-node)                 |
| `supabase/migrations/00031_add_waitlist.sql`        | Create | Waitlist table + RLS                                      |
| `src/types/database.ts`                             | Modify | Add `DbWaitlist` interface                                |
| `src/lib/email/templates/waitlist-confirmation.tsx` | Create | Waitlist confirmation email template                      |
| `src/lib/email/send.ts`                             | Modify | Add `sendWaitlistConfirmation()`                          |
| `src/app/(auth)/signup/actions.ts`                  | Create | `joinWaitlist` server action                              |
| `src/app/(auth)/signup/WaitlistForm.tsx`            | Create | Waitlist signup form component                            |
| `src/app/(auth)/signup/page.tsx`                    | Modify | Beta gate: show waitlist or signup                        |
| `src/app/providers.tsx`                             | Modify | Add PostHogWrapper                                        |
| `src/lib/supabase/middleware-utils.ts`              | Modify | CSP update for PostHog                                    |
| `src/app/landing-page.tsx`                          | Modify | Landing analytics tracking                                |
| `src/components/Landing/Hero.tsx`                   | Modify | CTA click tracking                                        |
| `.env.example`                                      | Modify | Add 3 new env vars                                        |

---

### Task 1: Install dependencies and update env vars

**Files:**

- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install posthog-js and posthog-node**

```bash
npm install posthog-js posthog-node
```

- [ ] **Step 2: Add new env vars to .env.example**

Add to the end of `.env.example`:

```
# PostHog — analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Resend — waitlist audience
RESEND_WAITLIST_AUDIENCE_ID=
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add posthog-js, posthog-node, update env vars"
```

---

### Task 2: Cookie consent utility

**Files:**

- Create: `src/lib/cookie-consent.ts`
- Create: `src/lib/cookie-consent.test.ts`

- [ ] **Step 1: Write the test**

Create `src/lib/cookie-consent.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { getConsentStatus, setConsentStatus, clearConsentStatus, type ConsentStatus } from './cookie-consent'

describe('cookie-consent', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns undecided by default', () => {
    expect(getConsentStatus()).toBe('undecided')
  })

  it('returns accepted after setConsentStatus("accepted")', () => {
    setConsentStatus('accepted')
    expect(getConsentStatus()).toBe('accepted')
  })

  it('returns declined after setConsentStatus("declined")', () => {
    setConsentStatus('declined')
    expect(getConsentStatus()).toBe('declined')
  })

  it('dispatches cookie-consent-changed event on set', () => {
    const handler = vi.fn()
    window.addEventListener('cookie-consent-changed', handler)
    setConsentStatus('accepted')
    expect(handler).toHaveBeenCalledTimes(1)
    expect((handler.mock.calls[0][0] as CustomEvent).detail.status).toBe('accepted')
    window.removeEventListener('cookie-consent-changed', handler)
  })

  it('returns undecided after clearConsentStatus', () => {
    setConsentStatus('accepted')
    clearConsentStatus()
    expect(getConsentStatus()).toBe('undecided')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/cookie-consent.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/cookie-consent.ts`:

```typescript
const CONSENT_KEY = 'qc-cookie-consent'

export type ConsentStatus = 'undecided' | 'accepted' | 'declined'

export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return 'undecided'
  const value = localStorage.getItem(CONSENT_KEY)
  if (value === 'accepted' || value === 'declined') return value
  return 'undecided'
}

export function setConsentStatus(status: 'accepted' | 'declined'): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONSENT_KEY, status)
  window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: { status } }))
}

export function clearConsentStatus(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CONSENT_KEY)
  window.dispatchEvent(new CustomEvent('cookie-consent-changed', { detail: { status: 'undecided' } }))
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/cookie-consent.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cookie-consent.ts src/lib/cookie-consent.test.ts
git commit -m "feat: add cookie consent utility with localStorage + CustomEvent"
```

---

### Task 3: Client-side analytics utility (must come before PostHog provider)

**Files:**

- Create: `src/lib/analytics.ts`
- Create: `src/lib/analytics.test.ts`

> **Why this order:** PostHogProvider (Task 4) imports `registerPostHog` from this module. Building it first avoids a forward dependency.

- [ ] **Step 1: Write the test**

Create `src/lib/analytics.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/analytics.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/analytics.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/analytics.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics.ts src/lib/analytics.test.ts
git commit -m "feat: add client-side analytics utility with landing/waitlist events"
```

---

### Task 4: PostHog provider + wrapper

**Files:**

- Create: `src/components/PostHogProvider.tsx`
- Create: `src/components/PostHogWrapper.tsx`

- [ ] **Step 1: Create PostHogProvider**

Create `src/components/PostHogProvider.tsx`:

```tsx
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
```

- [ ] **Step 2: Create PostHogWrapper**

Create `src/components/PostHogWrapper.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'

const PostHogProvider = dynamic(() => import('./PostHogProvider').then((mod) => mod.PostHogProvider), { ssr: false })

export function PostHogWrapper({ children }: { children: React.ReactNode }): React.ReactNode {
  return <PostHogProvider>{children}</PostHogProvider>
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PostHogProvider.tsx src/components/PostHogWrapper.tsx
git commit -m "feat: add PostHog provider with consent-based persistence"
```

---

### Task 5: Cookie consent banner

**Files:**

- Create: `src/components/ui/CookieConsent.tsx`

- [ ] **Step 1: Create the CookieConsent component**

Create `src/components/ui/CookieConsent.tsx`:

```tsx
'use client'

import { useCallback, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { getConsentStatus, setConsentStatus, type ConsentStatus } from '@/lib/cookie-consent'

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
            onClick={() => setConsentStatus('declined')}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Decline
          </button>
          <button
            onClick={() => setConsentStatus('accepted')}
            className="rounded-md bg-[hsl(var(--primary))] px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/CookieConsent.tsx
git commit -m "feat: add cookie consent banner component"
```

---

### Task 6: Server-side analytics utility

**Files:**

- Create: `src/lib/analytics-server.ts`
- Create: `src/lib/analytics-server.test.ts`

- [ ] **Step 1: Write the test**

Create `src/lib/analytics-server.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('posthog-node', () => {
  const capture = vi.fn()
  return {
    PostHog: vi.fn().mockImplementation(() => ({ capture })),
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/analytics-server.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/analytics-server.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/analytics-server.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics-server.ts src/lib/analytics-server.test.ts
git commit -m "feat: add server-side PostHog analytics via posthog-node"
```

---

### Task 7: Waitlist database migration + types

**Files:**

- Create: `supabase/migrations/00031_add_waitlist.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/00031_add_waitlist.sql`:

```sql
-- Waitlist table for capturing interest during private beta
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint on lowercase email to prevent duplicates
CREATE UNIQUE INDEX waitlist_email_unique ON public.waitlist (lower(email));

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- No public access policies. Only service role (admin client) can read/write.
-- This table is accessed exclusively via server actions.
```

- [ ] **Step 2: Add DbWaitlist type**

Add to the end of `src/types/database.ts`, before the closing of the file:

```typescript
export interface DbWaitlist {
  id: string
  email: string
  name: string | null
  source: string | null
  created_at: string
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00031_add_waitlist.sql src/types/database.ts
git commit -m "feat: add waitlist table migration and DbWaitlist type"
```

---

### Task 8: Waitlist email template + send function

**Files:**

- Create: `src/lib/email/templates/waitlist-confirmation.tsx`
- Modify: `src/lib/email/send.ts`

- [ ] **Step 1: Create the email template**

Create `src/lib/email/templates/waitlist-confirmation.tsx`:

```tsx
import { Html, Head, Body, Container, Text, Link } from '@react-email/components'

interface WaitlistConfirmationEmailProps {
  name?: string
  unsubscribeUrl?: string
}

export function WaitlistConfirmationEmail({ name, unsubscribeUrl }: WaitlistConfirmationEmailProps) {
  const greeting = name ? `Hey ${name},` : 'Hey there,'

  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>You're on the QC waitlist!</Text>
          <Text style={paragraph}>{greeting}</Text>
          <Text style={paragraph}>
            Thanks for your interest in QC! We're currently in private beta, letting people in gradually. We'll email
            you as soon as your spot is ready.
          </Text>
          <Text style={paragraph}>
            In the meantime, know that QC is being built to help couples strengthen their connection through regular
            check-ins, shared notes, and celebrating milestones together.
          </Text>
          <Text style={footerLinks}>
            <Link href="https://tryqc.co/privacy" style={link}>
              Privacy Policy
            </Link>
            {' · '}
            <Link href="https://tryqc.co/terms" style={link}>
              Terms of Service
            </Link>
          </Text>
          {unsubscribeUrl && (
            <Text style={footer}>
              <Link href={unsubscribeUrl} style={link}>
                Unsubscribe from QC emails
              </Link>
            </Text>
          )}
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
  maxWidth: '560px',
  margin: '40px auto',
  padding: '32px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
}

const heading = {
  fontSize: '24px',
  fontWeight: '600' as const,
  color: '#111827',
  marginBottom: '16px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  marginBottom: '16px',
}

const footer = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#6b7280',
}

const link = {
  color: '#111827',
  textDecoration: 'underline',
}

const footerLinks = {
  fontSize: '12px',
  lineHeight: '16px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  marginTop: '24px',
}
```

- [ ] **Step 2: Add sendWaitlistConfirmation to send.ts**

Add to the end of `src/lib/email/send.ts` (before any closing):

```typescript
import { WaitlistConfirmationEmail } from './templates/waitlist-confirmation'

export async function sendWaitlistConfirmation(email: string, name?: string): Promise<SendEmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tryqc.co'

  const { data, error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "You're on the QC waitlist!",
    react: WaitlistConfirmationEmail({
      name,
      unsubscribeUrl: `${baseUrl}/api/email/unsubscribe?email=${encodeURIComponent(email)}`,
    }),
  })

  return { data, error }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/email/templates/waitlist-confirmation.tsx src/lib/email/send.ts
git commit -m "feat: add waitlist confirmation email template and send function"
```

---

### Task 9: Waitlist server action

**Files:**

- Create: `src/app/(auth)/signup/actions.ts`
- Create: `src/app/(auth)/signup/actions.test.ts`

- [ ] **Step 1: Write the test**

Create `src/app/(auth)/signup/actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing the action
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers({ 'x-forwarded-for': '127.0.0.1' })),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}))

vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn().mockReturnValue({
    check: vi.fn().mockResolvedValue(true),
  }),
}))

vi.mock('@/lib/email/send', () => ({
  sendWaitlistConfirmation: vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null }),
}))

vi.mock('@/lib/email/resend', () => ({
  getResend: vi.fn().mockReturnValue({
    contacts: { create: vi.fn().mockResolvedValue({}) },
  }),
}))

vi.mock('@/lib/analytics-server', () => ({
  serverTrackWaitlistSignupCompleted: vi.fn(),
  serverTrackWaitlistSignupFailed: vi.fn(),
}))

describe('joinWaitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects invalid email', async () => {
    const { joinWaitlist } = await import('./actions')
    const result = await joinWaitlist({ email: 'not-an-email', name: 'Test' })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('succeeds with valid input', async () => {
    const { joinWaitlist } = await import('./actions')
    const result = await joinWaitlist({ email: 'test@example.com', name: 'Test User' })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/app/\(auth\)/signup/actions.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/app/(auth)/signup/actions.ts`:

```typescript
'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createRateLimiter } from '@/lib/rate-limit'
import { sendWaitlistConfirmation } from '@/lib/email/send'
import { getResend } from '@/lib/email/resend'
import { serverTrackWaitlistSignupCompleted, serverTrackWaitlistSignupFailed } from '@/lib/analytics-server'

const waitlistSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255),
  name: z.string().max(100).optional(),
  source: z.string().max(50).optional().default('signup_page'),
})

const waitlistRateLimiter = createRateLimiter({ maxRequests: 5, windowSeconds: 3600 })

interface JoinWaitlistResult {
  success: boolean
  error?: string
}

export async function joinWaitlist(input: {
  email: string
  name?: string
  source?: string
}): Promise<JoinWaitlistResult> {
  // 1. Validate
  const parsed = waitlistSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message
    serverTrackWaitlistSignupFailed(input.email || 'unknown', 'validation')
    return { success: false, error: firstError || 'Invalid input' }
  }
  const { email, name, source } = parsed.data

  // 2. Rate limit by IP
  const headersList = await headers()
  const ip = headersList.get('x-real-ip') || headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const allowed = await waitlistRateLimiter.check(`waitlist:ip:${ip}`)
  if (!allowed) {
    serverTrackWaitlistSignupFailed(email, 'rate_limit')
    return { success: false, error: 'Too many attempts. Please try again later.' }
  }

  // 3. Duplicate check (return success silently to avoid info leak)
  const supabase = createAdminClient()
  const { data: existing } = await supabase.from('waitlist').select('id').eq('email', email.toLowerCase()).maybeSingle()

  if (existing) {
    return { success: true }
  }

  // 4. Insert
  const { error: insertError } = await supabase
    .from('waitlist')
    .insert({ email: email.toLowerCase(), name: name || null, source })

  if (insertError) {
    // 23505 = unique violation (race condition defense)
    if (insertError.code === '23505') {
      return { success: true }
    }
    console.error('Waitlist insert failed:', insertError)
    serverTrackWaitlistSignupFailed(email, 'insert_error')
    return { success: false, error: 'Something went wrong. Please try again.' }
  }

  // 5. Add to Resend audience (best-effort)
  const audienceId = process.env.RESEND_WAITLIST_AUDIENCE_ID
  if (audienceId) {
    try {
      await getResend().contacts.create({
        audienceId,
        email: email.toLowerCase(),
        firstName: name || undefined,
        unsubscribed: false,
      })
    } catch (err) {
      console.error('Failed to add waitlist contact to Resend:', err)
    }
  }

  // 6. Send confirmation email (best-effort)
  try {
    await sendWaitlistConfirmation(email, name || undefined)
  } catch (err) {
    console.error('Failed to send waitlist confirmation:', err)
  }

  // 7. Track
  serverTrackWaitlistSignupCompleted(email, source)

  return { success: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/app/\(auth\)/signup/actions.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/\(auth\)/signup/actions.ts src/app/\(auth\)/signup/actions.test.ts
git commit -m "feat: add joinWaitlist server action with rate limiting + Resend sync"
```

---

### Task 10: WaitlistForm component

**Files:**

- Create: `src/app/(auth)/signup/WaitlistForm.tsx`

- [ ] **Step 1: Create the WaitlistForm**

Create `src/app/(auth)/signup/WaitlistForm.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { joinWaitlist } from './actions'
import { trackWaitlistFormViewed, trackWaitlistSignupAttempted } from '@/lib/analytics'

interface WaitlistFormProps {
  onAllowedEmail?: (email: string) => void
}

export function WaitlistForm({ onAllowedEmail }: WaitlistFormProps): React.ReactNode {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    trackWaitlistFormViewed()
  }, [])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setLoading(true)
    trackWaitlistSignupAttempted()

    // Check if this email is in the allowed list
    const allowedEmails = process.env.NEXT_PUBLIC_ALLOWED_EMAILS
    if (allowedEmails) {
      const list = allowedEmails.split(',').map((e) => e.trim().toLowerCase())
      if (list.includes(email.toLowerCase())) {
        onAllowedEmail?.(email)
        setLoading(false)
        return
      }
    }

    const result = await joinWaitlist({ email, name: name || undefined })

    if (!result.success) {
      setError(result.error || 'Something went wrong.')
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">You're on the list!</h1>
          <p className="text-sm text-gray-600">
            We'll email <span className="font-medium">{email}</span> when your spot is ready.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center min-h-[44px] text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Already have access? Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Join the waitlist</h1>
          <p className="mt-2 text-sm text-gray-600">QC is in private beta. Join the waitlist to get early access.</p>
        </div>

        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="waitlist-email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="waitlist-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-base min-h-[44px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="waitlist-name" className="block text-sm font-medium text-gray-700">
              Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="waitlist-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-base min-h-[44px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Your name"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[hsl(var(--primary))] px-4 py-2.5 text-base min-h-[44px] font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join waitlist'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Already have access?{' '}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500 inline-flex items-center min-h-[44px]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(auth\)/signup/WaitlistForm.tsx
git commit -m "feat: add WaitlistForm component with analytics tracking"
```

---

### Task 11: Signup page beta gate

**Files:**

- Modify: `src/app/(auth)/signup/page.tsx`

- [ ] **Step 1: Refactor signup page to gate on ALLOWED_EMAILS**

Replace the entire contents of `src/app/(auth)/signup/page.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { WaitlistForm } from './WaitlistForm'

function isBetaGateEnabled(): boolean {
  const allowed = process.env.NEXT_PUBLIC_ALLOWED_EMAILS
  return Boolean(allowed && allowed.trim().length > 0)
}

export default function SignupPage() {
  const [showSignup, setShowSignup] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Show waitlist form if gate is enabled and user hasn't been identified as allowed
  if (isBetaGateEnabled() && !showSignup) {
    return (
      <WaitlistForm
        onAllowedEmail={(allowedEmail) => {
          setEmail(allowedEmail)
          setShowSignup(true)
        }}
      />
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const allowedEmails = process.env.NEXT_PUBLIC_ALLOWED_EMAILS
    if (allowedEmails) {
      const list = allowedEmails.split(',').map((e) => e.trim().toLowerCase())
      if (!list.includes(email.toLowerCase())) {
        setError('Access restricted to approved accounts only.')
        setLoading(false)
        return
      }
    }

    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
        data: {
          display_name: displayName,
        },
      },
    })

    if (signUpError) {
      setError('Unable to create account. Please try again.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Check your email</h1>
          <p className="text-sm text-gray-600">
            We sent a confirmation link to <span className="font-medium">{email}</span>. Click the link to activate your
            account.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center min-h-[44px] text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create your account</h1>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500 inline-flex items-center min-h-[44px]"
            >
              Sign in
            </Link>
          </p>
        </div>

        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="display-name" className="block text-sm font-medium text-gray-700">
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-base min-h-[44px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-base min-h-[44px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-base min-h-[44px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-base min-h-[44px] font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: PASS (no type errors)

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/signup/page.tsx
git commit -m "feat: add beta gate to signup page — show waitlist for non-allowed emails"
```

---

### Task 12: Integrate PostHog into providers + update CSP

**Files:**

- Modify: `src/app/providers.tsx`
- Modify: `src/lib/supabase/middleware-utils.ts`

- [ ] **Step 1: Add PostHogWrapper to providers**

Replace `src/app/providers.tsx` with:

```tsx
'use client'

import { Toaster } from 'sonner'
import { MotionConfig } from 'framer-motion'

import { ThemeProvider } from '@/contexts/ThemeContext'
import { PostHogWrapper } from '@/components/PostHogWrapper'
import { CookieConsent } from '@/components/ui/CookieConsent'

export function Providers({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <PostHogWrapper>
          {children}
          <CookieConsent />
        </PostHogWrapper>
        <Toaster position="top-center" richColors />
      </MotionConfig>
    </ThemeProvider>
  )
}
```

- [ ] **Step 2: Update CSP to allow PostHog**

In `src/lib/supabase/middleware-utils.ts`, add a PostHog host variable and update the CSP. Before the `const csp = [` line, add:

```typescript
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
```

Then change the `script-src` line:

Replace:

```typescript
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
```

With:

```typescript
    `script-src 'self' 'unsafe-inline' ${posthogHost}${isDev ? " 'unsafe-eval'" : ''}`,
```

And change the `connect-src` line:

Replace:

```typescript
    `connect-src 'self' https://*.supabase.co${extraConnectSrc}${isDev ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
```

With:

```typescript
    `connect-src 'self' https://*.supabase.co ${posthogHost}${extraConnectSrc}${isDev ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/providers.tsx src/lib/supabase/middleware-utils.ts
git commit -m "feat: integrate PostHog wrapper into providers + update CSP"
```

---

### Task 13: Landing page analytics tracking

**Files:**

- Modify: `src/app/landing-page.tsx`
- Modify: `src/components/Landing/Hero.tsx`

- [ ] **Step 1: Add analytics to landing page**

In `src/app/landing-page.tsx`, add the import and useEffect for tracking:

Add import at top:

```typescript
import { useEffect } from 'react'
import { trackLandingViewed, trackCtaClicked, initScrollDepthTracking } from '@/lib/analytics'
```

Inside the `LandingPage` function, before the `return`, add:

```typescript
useEffect(() => {
  trackLandingViewed()
  const cleanup = initScrollDepthTracking()
  return cleanup
}, [])
```

Update the nav "Sign Up" link to track clicks. Change:

```tsx
<Link
  href="/signup"
  className="inline-flex items-center rounded-lg bg-[hsl(var(--primary))] px-4 py-2 min-h-[44px] text-sm font-medium text-white transition-opacity hover:opacity-90"
>
  Sign Up
</Link>
```

To:

```tsx
<Link
  href="/signup"
  onClick={() => trackCtaClicked('nav', 'Sign Up')}
  className="inline-flex items-center rounded-lg bg-[hsl(var(--primary))] px-4 py-2 min-h-[44px] text-sm font-medium text-white transition-opacity hover:opacity-90"
>
  Sign Up
</Link>
```

- [ ] **Step 2: Add CTA tracking to Hero**

In `src/components/Landing/Hero.tsx`, add the import:

```typescript
import { trackCtaClicked } from '@/lib/analytics'
```

Update the "Start your journey" button's Link to add onClick:

```tsx
            <Link href="/signup" className="flex items-center gap-2" onClick={() => trackCtaClicked('hero', 'Start your journey')}>
```

Update the "Learn more" button's anchor to add onClick:

```tsx
<a href="#features" onClick={() => trackCtaClicked('hero', 'Learn more')}>
  Learn more
</a>
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/landing-page.tsx src/components/Landing/Hero.tsx
git commit -m "feat: add PostHog analytics tracking to landing page + hero CTAs"
```

---

### Task 14: Run full quality checks

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: PASS (no errors)

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: All tests pass

- [ ] **Step 4: Run knip (dead code detection)**

```bash
npm run knip
```

Expected: No unexpected unused exports

- [ ] **Step 5: Fix any issues found, commit fixes**

If any quality checks fail, fix the issues and commit:

```bash
git add -A
git commit -m "fix: resolve quality check issues"
```

---

### Task 15: Manual verification checklist

These steps require PostHog and Resend to be configured:

- [ ] **Step 1: Set env vars locally** — Add `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, and `RESEND_WAITLIST_AUDIENCE_ID` to `.env.local`
- [ ] **Step 2: Apply migration** — Run `make db-push` to apply the waitlist table migration
- [ ] **Step 3: Start dev server** — `npm run dev`
- [ ] **Step 4: Visit landing page** — Verify cookie consent banner appears, accept/decline works
- [ ] **Step 5: Check PostHog** — Verify `landing_viewed` event appears in PostHog dashboard
- [ ] **Step 6: Visit /signup** — Verify waitlist form appears (when `NEXT_PUBLIC_ALLOWED_EMAILS` is set)
- [ ] **Step 7: Submit waitlist form** — Verify success message, check `waitlist` table in Supabase, check Resend audience
- [ ] **Step 8: Check email** — Verify waitlist confirmation email arrives
- [ ] **Step 9: Test allowed email** — Enter an email from `NEXT_PUBLIC_ALLOWED_EMAILS` in the waitlist form, verify it switches to the real signup form
