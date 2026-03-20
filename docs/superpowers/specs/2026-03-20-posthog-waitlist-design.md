# PostHog Integration + Waitlist with Resend

**Date**: 2026-03-20
**Status**: Approved
**Approach**: Minimal port from seatify (mean-weasel/seatify) patterns adapted to QC conventions

## Context

QC is in private beta with access gated by `ALLOWED_EMAILS`. Currently the signup page shows a generic "Access restricted" error when non-approved emails attempt signup. There is no waitlist capture, no analytics beyond Vercel Analytics and Sentry, and no way to measure landing page conversion.

This spec adds:

1. PostHog analytics for landing page and waitlist funnel tracking
2. A waitlist flow that captures interested users and sends a confirmation email via Resend

## Decisions

| Decision               | Choice                                                     | Rationale                                              |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| Beta gate behavior     | Hard gate — signup becomes waitlist for non-allowed emails | Captures demand while keeping access controlled        |
| PostHog tracking scope | Landing + waitlist funnel only                             | No in-app events yet; focused on acquisition data      |
| Waitlist email content | Simple confirmation, no CTA                                | Minimal; avoid over-promising when timeline is unknown |
| PostHog consent model  | Consent-first (memory-only until accepted)                 | Aligns with QC's "privacy-first" brand promise         |
| Waitlist storage       | Supabase table + Resend audience                           | Queryable locally + email campaign capability          |

## 1. PostHog Provider + Consent Banner

### PostHogProvider (`src/components/PostHogProvider.tsx`)

Client component that initializes `posthog-js`:

- `persistence: 'memory'` — no cookies or localStorage until user consents
- `autocapture: false` — we track events manually via analytics utility
- `capture_pageview: false` — manual page view tracking
- Reads `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`
- Exports `upgradePostHogPersistence()` — called when user accepts cookie consent, switches persistence to `localStorage+cookie`
- Only initializes when `NEXT_PUBLIC_POSTHOG_KEY` is set (graceful no-op in dev without keys)

### PostHogWrapper (`src/components/PostHogWrapper.tsx`)

Dynamic import wrapper using `next/dynamic` with `ssr: false`. Keeps the ~60KB PostHog bundle off the server render and prevents hydration issues.

### CookieConsent (`src/components/ui/CookieConsent.tsx`)

Minimal banner fixed to the bottom of the viewport:

- "Accept" upgrades PostHog persistence via `upgradePostHogPersistence()`
- "Decline" keeps memory-only (anonymous, no persistence)
- Stores preference in `localStorage` key `qc-cookie-consent` so banner doesn't re-show
- Tracks `cookie_consent_responded` event with `accepted: boolean`
- Styled to match QC's rose/pink theme with backdrop blur

### Integration

`PostHogWrapper` added to `src/app/providers.tsx` wrapping children inside the existing provider tree. `CookieConsent` renders inside the wrapper.

### CSP Update (`src/lib/supabase/middleware-utils.ts`)

The existing Content Security Policy must be updated to allow PostHog requests. Add to:

- `connect-src`: `https://us.i.posthog.com` (or the configured `NEXT_PUBLIC_POSTHOG_HOST`)
- `script-src`: `https://us.i.posthog.com` (for the PostHog JS bundle loaded dynamically)

Without this, browser CSP enforcement will silently block PostHog network requests.

## 2. Analytics Events

### Analytics utility (`src/lib/analytics.ts`)

Thin wrapper around `posthog.capture()` with named exports for each event. All functions check PostHog is initialized before firing. No raw `posthog.capture()` calls elsewhere in the codebase.

| Event                       | Function                                | When                               | Properties                                             |
| --------------------------- | --------------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| `landing_viewed`            | `trackLandingViewed()`                  | Landing page mount                 | `referrer`, `utm_source`, `utm_medium`, `utm_campaign` |
| `landing_scrolled`          | `trackLandingScrolled(depth)`           | Scroll depth 25/50/75/100%         | `depth_percent`                                        |
| `cta_clicked`               | `trackCtaClicked(cta)`                  | Any CTA button click               | `cta_location`, `cta_text`                             |
| `waitlist_form_viewed`      | `trackWaitlistFormViewed()`             | Signup page loads with gate active | `source`                                               |
| `waitlist_signup_attempted` | `trackWaitlistSignupAttempted()`        | Form submitted                     | —                                                      |
| `waitlist_signup_completed` | `trackWaitlistSignupCompleted(source)`  | Server action succeeds             | `source`                                               |
| `waitlist_signup_failed`    | `trackWaitlistSignupFailed(reason)`     | Validation or rate limit error     | `reason`                                               |
| `cookie_consent_responded`  | `trackCookieConsentResponded(accepted)` | Cookie banner interaction          | `accepted`                                             |

Core funnel: `landing_viewed` → `cta_clicked` → `waitlist_form_viewed` → `waitlist_signup_completed`

Server-side events (`waitlist_signup_completed`, `waitlist_signup_failed`) use `posthog-node` since server actions don't have access to the client-side PostHog instance.

### Server-side analytics (`src/lib/analytics-server.ts`)

Separate file for server-side PostHog via `posthog-node`:

- Lazy-initialized `PostHog` client singleton (reads `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`)
- Exports `serverTrackWaitlistSignupCompleted(email, source)` and `serverTrackWaitlistSignupFailed(email, reason)`
- Uses `posthog.capture()` with `distinctId` set to the email (since waitlist users have no user ID)
- Calls `posthog.shutdown()` is NOT needed per-request — the singleton flushes automatically

## 3. Waitlist Database + Server Action

### Supabase migration (`supabase/migrations/00031_add_waitlist.sql`)

```sql
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- No public access policies. Only service role (admin client) can read/write.
-- This table is accessed exclusively via server actions.
```

### Server action (`src/app/(auth)/signup/actions.ts`)

Colocated with the signup page following QC's established pattern (e.g., `onboarding/actions.ts`, `settings/actions.ts`).

`joinWaitlist(formData: FormData)` — `'use server'` action:

1. **Validate** — Zod schema: `email` (required, valid email), `name` (optional string), `source` (optional string)
2. **Rate limit** — `createRateLimiter({ maxRequests: 5, windowSeconds: 3600 })` keyed by IP from `headers()`
3. **Duplicate check** — Query `waitlist` table by email. If exists, return success silently (no information leak)
4. **Insert** — Insert into `waitlist` table via `createAdminClient()`
5. **Resend audience** — Add contact via `resend.contacts.create({ audienceId: RESEND_WAITLIST_AUDIENCE_ID, email, firstName: name })`
6. **Send email** — Call `sendWaitlistConfirmation(email, name)` (note: `shouldSendEmail()` is NOT called here since waitlist users have no `profiles` row; bounce handling for waitlist emails is out of scope for this phase)
7. **Track** — Server-side PostHog capture via `posthog-node` client (see analytics section below): `waitlist_signup_completed` on success, `waitlist_signup_failed` on error

Returns `{ success: boolean, error?: string }`.

## 4. Waitlist Email Template

### Template (`src/lib/email/templates/waitlist-confirmation.tsx`)

Follows QC's existing email pattern (matches `welcome.tsx` styles):

- Light gray body (`#f9fafb`), white container, system font stack
- Heading: "You're on the QC waitlist!"
- Greeting: "Hey {name}," or "Hey there," if no name
- Body: "QC is currently in private beta. We're letting people in gradually and will email you as soon as your spot is ready."
- No CTA button
- Footer: Privacy Policy + Terms of Service links
- Unsubscribe link

### Send function

New `sendWaitlistConfirmation(email: string, name?: string)` in `src/lib/email/send.ts`:

- No couple-scoped rate limiting (waitlist emails aren't tied to a couple)
- Uses existing `getResend()` singleton and `EMAIL_FROM`
- Subject: "You're on the QC waitlist!"

## 5. Signup Page Beta Gate + Waitlist UI

### Signup page refactor (`src/app/(auth)/signup/page.tsx`)

The page determines which form to show:

- **Gate enabled** (`NEXT_PUBLIC_ALLOWED_EMAILS` is set and non-empty): renders `WaitlistForm` by default. The waitlist form itself collects email — if the entered email is in the allowed list, the page switches to show the real signup form. This way allowed beta testers can still sign up without a separate URL.
- **Gate disabled**: renders existing signup form unchanged (future-proofs for open access)

A small "Already have access? Sign in" link appears below the waitlist form. The existing "Already have an account? Sign in" link remains on the signup form.

### WaitlistForm (`src/app/(auth)/signup/WaitlistForm.tsx`)

Client component with:

- Email input (required) + name input (optional)
- Calls `joinWaitlist` server action on submit
- Success state: "You're on the list! We'll email you when your spot is ready."
- Error state: shows validation/rate limit messages
- Tracks `waitlist_form_viewed` on mount, `waitlist_signup_attempted` on submit
- Styled to match existing signup page layout (same container, spacing, `min-h-[44px]` inputs, rose-themed button)

### Landing page changes

Minimal changes to existing landing page:

- **`Hero.tsx`**: Add `trackCtaClicked()` to "Start your journey" and "Learn more" buttons. Both still link to `/signup` and `#features` respectively.
- **`landing-page.tsx`**: Add `trackLandingViewed()` on mount. Add `trackCtaClicked()` to nav "Sign Up" link. Initialize scroll depth tracking.
- No new landing page sections, modals, or layout changes.

## 6. Setup + Dependencies

### New npm packages

- `posthog-js` — client-side analytics
- `posthog-node` — server-side event capture (waitlist server action)

### New environment variables (added to `.env.example`)

```
# PostHog — analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Resend — waitlist audience
RESEND_WAITLIST_AUDIENCE_ID=
```

### Manual setup steps (not automated)

1. Create "QC" project in PostHog dashboard (app.posthog.com)
2. Copy project API key → `NEXT_PUBLIC_POSTHOG_KEY` in Vercel env vars
3. Set `NEXT_PUBLIC_POSTHOG_HOST` in Vercel env vars
4. Create "QC Waitlist" audience in Resend dashboard
5. Copy audience ID → `RESEND_WAITLIST_AUDIENCE_ID` in Vercel env vars

## Files Changed/Created

| File                                                | Action | Description                                      |
| --------------------------------------------------- | ------ | ------------------------------------------------ |
| `src/components/PostHogProvider.tsx`                | Create | PostHog init with consent-based persistence      |
| `src/components/PostHogWrapper.tsx`                 | Create | Dynamic import wrapper (SSR-disabled)            |
| `src/components/ui/CookieConsent.tsx`               | Create | Cookie consent banner                            |
| `src/lib/analytics.ts`                              | Create | Client-side analytics event functions            |
| `src/lib/analytics-server.ts`                       | Create | Server-side PostHog client (posthog-node)        |
| `src/app/(auth)/signup/actions.ts`                  | Create | Waitlist server action (colocated with signup)   |
| `src/app/(auth)/signup/WaitlistForm.tsx`            | Create | Waitlist signup form (colocated with signup)     |
| `src/lib/email/templates/waitlist-confirmation.tsx` | Create | Waitlist confirmation email                      |
| `src/lib/email/send.ts`                             | Modify | Add `sendWaitlistConfirmation()`                 |
| `src/app/providers.tsx`                             | Modify | Add PostHogWrapper                               |
| `src/app/(auth)/signup/page.tsx`                    | Modify | Add beta gate logic with allowed-email detection |
| `src/app/landing-page.tsx`                          | Modify | Add landing analytics tracking                   |
| `src/components/Landing/Hero.tsx`                   | Modify | Add CTA click tracking                           |
| `src/lib/supabase/middleware-utils.ts`              | Modify | Add PostHog host to CSP connect-src + script-src |
| `supabase/migrations/00031_add_waitlist.sql`        | Create | Waitlist table + RLS                             |
| `src/types/database.ts`                             | Modify | Add `DbWaitlist` interface                       |
| `.env.example`                                      | Modify | Add 3 new env vars                               |
| `package.json`                                      | Modify | Add posthog-js, posthog-node                     |

## Out of Scope

- In-app event tracking (check-ins, notes, etc.) — future phase
- Referral/viral mechanics
- Waitlist admin UI
- Email drip sequences
- PostHog feature flags
- A/B testing
- Disposable email filtering (seatify has this but QC doesn't need it yet — low volume)
