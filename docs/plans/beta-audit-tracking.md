# Beta Audit Tracking

Holistic beta-readiness audit across feature completeness, error handling, UX polish, ops readiness, and performance.

---

## Iteration Log

### Iteration 1 (2026-03-01)

**Findings:** 90+ total across 5 dimensions (~20 HIGH, ~30 MEDIUM, ~40 LOW)
**Code fixes applied:** 12
**Manual to-dos added:** 8
**Deferred:** 60+ (LOW items + remaining MEDIUM for future iterations)

#### Fixed (Code)

- [x] Remove console.log placeholder handlers in PrimaryActionFAB and MobileActionBar — wire to real routes (dimension: feature, severity: HIGH)
- [x] Add useMemo to CheckInContext, LoveLanguagesContext, SessionSettingsContext to prevent unnecessary re-renders (dimension: performance, severity: HIGH)
- [x] Add error.tsx for onboarding route (dimension: error-handling, severity: HIGH)
- [x] Add error.tsx for invite/[token] route (dimension: error-handling, severity: HIGH)
- [x] Throttle dashboard router.refresh() on visibilitychange to once per 30s (dimension: performance, severity: HIGH)
- [x] Add List-Unsubscribe and List-Unsubscribe-Post headers to outgoing emails (dimension: ops, severity: HIGH)
- [x] Replace non-null assertions with explicit env var validation in Supabase clients (dimension: ops, severity: HIGH)
- [x] Add skip-to-content link for accessibility in root layout (dimension: polish, severity: HIGH)
- [x] Add id="main-content" to app shell and landing page main elements (dimension: polish, severity: HIGH)
- [x] Add aria-labels to icon-only buttons in NoteEditor (close, tag remove) (dimension: polish, severity: MEDIUM)
- [x] Fix misleading "No couple found" message on notes page to "Complete onboarding first" (dimension: error-handling, severity: MEDIUM)
- [x] Add .limit(100) to notes page query to prevent unbounded fetch (dimension: performance, severity: MEDIUM)
- [x] Add dashboard query error logging for silent failures (dimension: error-handling, severity: HIGH)
- [x] Add MotionConfig reducedMotion="user" to respect prefers-reduced-motion (dimension: polish, severity: MEDIUM)

#### Manual To-Dos Added

- Set up error monitoring service (Sentry/Datadog) (dimension: ops, severity: HIGH)
- Configure uptime monitoring (Pingdom/UptimeRobot) for tryqc.co (dimension: ops, severity: MEDIUM)
- Decide on and publish support contact method (email/GitHub) in legal pages (dimension: feature, severity: HIGH)
- Configure Resend with production domain email sender (dimension: ops, severity: MEDIUM)
- Monitor Resend email deliverability and bounce rates (dimension: ops, severity: MEDIUM)
- Verify all required env vars are set in Vercel dashboard (dimension: ops, severity: MEDIUM)
- Add account deletion functionality (promised in legal pages) (dimension: feature, severity: HIGH)
- Add password change and email change functionality (dimension: feature, severity: MEDIUM)

#### Deferred

- [ ] Add error.tsx to all remaining route segments (dimension: error-handling, severity: MEDIUM, will address in iteration 2)
- [ ] Add not-found.tsx pages for invalid routes (dimension: error-handling, severity: MEDIUM, will address in iteration 2)
- [ ] Offline/network failure detection (dimension: error-handling, severity: HIGH, requires architectural decision)
- [ ] Context provider route-based splitting (dimension: performance, severity: HIGH, requires architectural redesign)
- [ ] Dashboard N+1 queries — consolidate into DB view/RPC (dimension: performance, severity: HIGH, needs migration)
- [ ] Missing pagination on reminders/requests pages (dimension: performance, severity: MEDIUM)
- [ ] Dynamic imports for recharts, canvas-confetti (dimension: performance, severity: HIGH, bundle optimization)
- [ ] Replace raw img tags with next/image in PhotoGallery (dimension: performance, severity: MEDIUM)
- [ ] Add Suspense boundaries for streaming (dimension: performance, severity: MEDIUM)
- [ ] Health check endpoint — add DB connectivity check (dimension: ops, severity: MEDIUM)
- [ ] Rate limiting on public API endpoints (dimension: ops, severity: HIGH, needs rate-limit middleware)
- [ ] Missing focus trap in NoteEditor modal (dimension: polish, severity: HIGH)
- [ ] Add aria-live regions for dynamic content updates (dimension: polish, severity: MEDIUM)
- [ ] Cookie consent banner for GDPR (dimension: feature, severity: LOW)
- [ ] Email re-subscription UI (dimension: feature, severity: HIGH)
- [ ] Avatar upload via Supabase Storage (dimension: feature, severity: MEDIUM)
- [ ] File size validation for photo uploads (dimension: error-handling, severity: MEDIUM)
- [ ] Bulk delete undo/soft-delete for notes (dimension: error-handling, severity: MEDIUM)
- [ ] Relationship date format validation in onboarding (dimension: error-handling, severity: MEDIUM)
- [ ] Auth callback error details improvement (dimension: error-handling, severity: MEDIUM)

### Iteration 2 (2026-03-01)

**Findings:** Focused on deferred HIGH and MEDIUM items from iteration 1
**Code fixes applied:** 13
**Manual to-dos added:** 0
**Deferred:** 10

#### Fixed (Code)

- [x] Dynamic import for canvas-confetti — reduce initial bundle ~8KB (dimension: performance, severity: HIGH)
- [x] Dynamic import for HealthChart/recharts via next/dynamic — reduce initial bundle ~95KB (dimension: performance, severity: HIGH)
- [x] Rate limiting on email webhook endpoint (100 req/60s per IP) (dimension: ops, severity: HIGH)
- [x] Rate limiting on unsubscribe endpoint (10 req/60s per IP) (dimension: ops, severity: HIGH)
- [x] Focus trap improvement on NoteEditor modal — role="dialog", aria-modal, Escape key handler (dimension: polish, severity: HIGH)
- [x] Add error.tsx for checkin route with resume/dashboard recovery actions (dimension: error-handling, severity: MEDIUM)
- [x] Add .limit(100) to reminders page query (dimension: performance, severity: MEDIUM)
- [x] Add .limit(100) to requests page query (dimension: performance, severity: MEDIUM)
- [x] Replace raw img with next/image in PhotoGallery (grid + lightbox) (dimension: performance, severity: MEDIUM)
- [x] Add 10MB file size validation for milestone photo uploads (dimension: error-handling, severity: MEDIUM)
- [x] Add relationship date format + future-date validation in onboarding (dimension: error-handling, severity: MEDIUM)
- [x] Add contextual error messages in auth callback (expired/already used/generic) (dimension: error-handling, severity: MEDIUM)
- [x] Rewrite health check endpoint with DB connectivity check (dimension: ops, severity: MEDIUM)

#### Deferred

- [ ] Offline/network failure detection (dimension: error-handling, severity: HIGH, requires architectural decision)
- [ ] Context provider route-based splitting (dimension: performance, severity: HIGH, requires architectural redesign)
- [ ] Dashboard N+1 queries — consolidate into DB view/RPC (dimension: performance, severity: HIGH, needs migration)
- [ ] Email re-subscription UI (dimension: feature, severity: HIGH, feature work)
- [ ] Add Suspense boundaries for streaming (dimension: performance, severity: MEDIUM)
- [ ] Add aria-live regions for dynamic content updates (dimension: polish, severity: MEDIUM)
- [ ] Avatar upload via Supabase Storage (dimension: feature, severity: MEDIUM, feature work)
- [ ] Bulk delete undo/soft-delete for notes (dimension: error-handling, severity: MEDIUM)
- [ ] Add not-found.tsx pages for invalid routes (dimension: error-handling, severity: MEDIUM)
- [ ] Cookie consent banner for GDPR (dimension: feature, severity: LOW)

### Iteration 3 (2026-03-02)

**Findings:** 50+ total across 5 dimensions (8 HIGH, 15 MEDIUM, 27+ LOW)
**Code fixes applied:** 10
**Manual to-dos added:** 1
**Deferred:** 15

#### Fixed (Code)

- [x] Wrap JSON.parse in try-catch in notes actions to prevent unhandled errors on malformed tags (dimension: error-handling, severity: HIGH)
- [x] Add aria-label="Close" to MobileSheet close button for screen reader accessibility (dimension: polish, severity: HIGH)
- [x] Fix invite rate limiter to use IP address instead of token — prevents brute-force on invite tokens (dimension: ops, severity: HIGH)
- [x] Remove PII (email IDs) from email webhook console.log statements (dimension: ops, severity: HIGH)
- [x] Replace hardcoded `example.com` fallback URL in cron with `tryqc.co` (dimension: ops, severity: MEDIUM)
- [x] Fix useCategories hook infinite re-render — memoize Supabase client instance (dimension: performance, severity: HIGH)
- [x] Parallelize sequential queries in requests page with Promise.all (dimension: performance, severity: MEDIUM)
- [x] Parallelize 5 sequential queries in settings page with Promise.all (dimension: performance, severity: MEDIUM)
- [x] Replace raw `<img>` with next/image in MilestoneCard featured variant (dimension: performance, severity: MEDIUM)
- [x] Add not-found.tsx for (app) route group (dimension: error-handling, severity: MEDIUM)

#### Manual To-Dos Added

- Add SECURITY.md with vulnerability reporting instructions (dimension: ops, severity: LOW)

#### Deferred

- [ ] Offline/network failure detection (dimension: error-handling, severity: HIGH, requires architectural decision)
- [ ] Context provider route-based splitting (dimension: performance, severity: HIGH, requires architectural redesign)
- [ ] Dashboard N+1 queries — consolidate into DB view/RPC (dimension: performance, severity: HIGH, needs migration)
- [ ] Email re-subscription UI (dimension: feature, severity: HIGH, feature work)
- [ ] Quiet hours enforcement in cron job (dimension: feature, severity: HIGH, needs product decision on schedule format)
- [ ] In-memory rate limiter not persistent across instances (dimension: ops, severity: HIGH, needs Redis or external store)
- [ ] Add Suspense boundaries for streaming (dimension: performance, severity: MEDIUM)
- [ ] Add aria-live regions for dynamic content updates (dimension: polish, severity: MEDIUM)
- [ ] Avatar upload via Supabase Storage (dimension: feature, severity: MEDIUM, feature work)
- [ ] Bulk delete undo/soft-delete for notes (dimension: error-handling, severity: MEDIUM)
- [ ] Missing required field visual indicators on forms (dimension: polish, severity: MEDIUM)
- [ ] Inconsistent form styling — raw select vs Radix Select (dimension: polish, severity: MEDIUM)
- [x] ~~LoveLanguagesContext missing useCallback on realtime handlers~~ Already has useCallback — false finding (dimension: performance, severity: N/A)
- [x] SessionSettingsContext sequential loads could be parallelized (dimension: performance, severity: MEDIUM) — fixed in iteration 4
- [ ] Cookie consent banner for GDPR (dimension: feature, severity: LOW)

### Iteration 4 (2026-03-02)

**Findings:** Targeted deferred MEDIUM items from iteration 3 + new scan
**Code fixes applied:** 3
**Manual to-dos added:** 0
**Deferred:** 10

#### Fixed (Code)

- [x] Memoize Supabase client + parallelize settings/proposal loads + wrap realtime handlers in useCallback in SessionSettingsContext (dimension: performance, severity: MEDIUM)
- [x] Wrap realtime handlers in useCallback in CheckInContext to prevent re-subscriptions (dimension: performance, severity: MEDIUM)
- [x] Replace window.location.href with router.push in love-languages PartnerLanguagesTab (dimension: performance, severity: MEDIUM)

#### Deferred

- [ ] Offline/network failure detection (dimension: error-handling, severity: HIGH, requires architectural decision)
- [ ] Context provider route-based splitting (dimension: performance, severity: HIGH, requires architectural redesign)
- [ ] Dashboard N+1 queries — consolidate into DB view/RPC (dimension: performance, severity: HIGH, needs migration)
- [ ] Email re-subscription UI (dimension: feature, severity: HIGH, feature work)
- [ ] Quiet hours enforcement in cron job (dimension: feature, severity: HIGH, needs product decision)
- [ ] In-memory rate limiter not persistent across instances (dimension: ops, severity: HIGH, needs Redis)
- [ ] Add Suspense boundaries for streaming (dimension: performance, severity: MEDIUM)
- [ ] Add aria-live regions for dynamic content updates (dimension: polish, severity: MEDIUM)
- [ ] Missing required field visual indicators on forms (dimension: polish, severity: MEDIUM)
- [ ] Cookie consent banner for GDPR (dimension: feature, severity: LOW)
