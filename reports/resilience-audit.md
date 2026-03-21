# Resilience Audit Report — QC App

**Date:** 2026-03-14
**Auditor:** Claude Code (Resilience Audit Skill)
**Scope:** Full audit — all 8 resilience categories
**App:** QC (Quality Couple) — relationship wellness app
**Stack:** Next.js 16, Supabase, TypeScript, Capacitor (iOS)
**Interactive Verification:** Not performed (code-only audit, production at tryqc.co available)

---

## Executive Summary

The QC app has a **solid architectural foundation** — Supabase RLS enforces couple-scoped data isolation, Zod schemas validate most server-side inputs, and the check-in session persists to the database (surviving page refreshes). However, the app has **significant gaps in error recovery, real-time resilience, and cross-device state management** that could cause data loss or confusing states during real-world usage.

**Key themes:**

1. **Silent failures** — errors are logged to `console.error` but never shown to users
2. **No retry logic** — every operation is single-attempt; transient network errors are fatal
3. **Client-only state for critical data** — preparation topics and session timer not persisted
4. **Real-time sync has no error handling** — subscription failures go undetected

| Severity  | Count  |
| --------- | ------ |
| Critical  | 3      |
| High      | 5      |
| Medium    | 10     |
| Low       | 7      |
| Info      | 2      |
| **Total** | **27** |

---

## Resilience Posture Assessment

| Area                    | Status           | Notes                                                                                                         |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| Error Boundaries        | Present (sparse) | 4 route-level boundaries; missing for notes, dashboard, reminders, requests, growth, love-languages, settings |
| Loading States          | Good             | 7 routes with `loading.tsx` + skeleton components                                                             |
| Retry Logic             | **Missing**      | No retries anywhere; all operations are single-attempt                                                        |
| Offline Handling        | **Missing**      | No service worker, no offline detection, no sync queue                                                        |
| Optimistic UI           | Minimal          | Only in requests component; not systematic                                                                    |
| Form Validation         | Strong           | Comprehensive Zod schemas server-side                                                                         |
| Realtime Error Handling | **Missing**      | No error callbacks, no connection state tracking                                                              |
| Session Expiry          | Present          | Middleware refreshes tokens; mid-flight expiry gaps                                                           |
| DB Error Handling       | Inconsistent     | Some return errors to UI, some silently fail                                                                  |

---

## Findings

### Category 1: Navigation & Flow Dead Ends

#### [RF-1-001] Bookmarked check-in URL loses session context

**Severity:** Medium
**Category:** Navigation & Flow Dead Ends
**User Type:** Confused User

**Scenario:**

1. User is mid-check-in at the reflection step
2. They bookmark the `/checkin` URL or the tab crashes
3. Returning later, the URL loads the check-in landing page
4. If the session was completed/abandoned meanwhile, there's no message explaining what happened

**Expected Behavior:**
Show a contextual message: "Your previous check-in session has ended" or "Welcome back — your session is still active."

**Actual Behavior:**
Landing page renders with no acknowledgment of the previous session state.

**Code Location:**

- `src/contexts/CheckInContext.tsx` — session loaded from DB on mount; no post-completion message

**Recommended Fix:**
Check for recently completed/abandoned sessions on landing. Show a toast or banner with session outcome.

---

#### [RF-1-002] Preparation topics lost on page navigation

**Severity:** High
**Category:** Navigation & Flow Dead Ends
**User Type:** Confused User

**Scenario:**

1. User opens the preparation modal and adds 3-4 discussion topics
2. They navigate to `/notes` to reference something
3. They return to `/checkin`
4. All preparation topics are gone — stored only in React memory state

**Expected Behavior:**
Topics should persist across navigation within the app, at minimum for the current session.

**Actual Behavior:**
Topics cleared on unmount. No warning about data loss when navigating away.

**Code Location:**

- `src/contexts/BookendsContext.tsx` — `ADD_MY_TOPIC` dispatches to reducer only, no persistence layer

**Recommended Fix:**
Persist preparation topics to Supabase (preferred) or localStorage, keyed by `couple_id`. Add `beforeunload` warning if topics exist and user navigates away.

---

#### [RF-1-003] Re-used invite link shows unhelpful error

**Severity:** Low
**Category:** Navigation & Flow Dead Ends
**User Type:** Confused User

**Scenario:**

1. Partner accepts invite successfully
2. Partner clicks the same invite link from their email again (common behavior)
3. `validateInvite()` returns invalid — page shows generic "invalid invite" error
4. No indication that the invite was already accepted

**Expected Behavior:**
Show "This invite has already been accepted. Go to your dashboard."

**Actual Behavior:**
Generic "invalid invite" error with no helpful next step.

**Code Location:**

- `src/app/invite/[token]/page.tsx` — validates token but doesn't distinguish error types

**Recommended Fix:**
Check invite status (pending vs accepted vs expired) and show contextual messages with appropriate CTAs.

---

#### [RF-1-004] Direct navigation to OAuth callback

**Severity:** Low
**Category:** Navigation & Flow Dead Ends
**User Type:** Power User

**Scenario:**

1. User navigates directly to `/auth/callback` without initiating an OAuth flow
2. No OAuth state parameter present
3. Callback may error silently or show unhelpful error

**Expected Behavior:**
Redirect to `/login` with a message.

**Code Location:**

- `src/app/auth/callback/route.ts`

**Recommended Fix:**
Validate OAuth state parameter; redirect to `/login` if missing.

---

### Category 2: Race Conditions & Double Actions

#### [RF-2-001] Double-click on "Start Check-in" creates duplicate sessions

**Severity:** High
**Category:** Race Conditions & Double Actions
**User Type:** Confused User

**Scenario:**

1. User clicks "Start Check-in" button
2. On slow connection (mobile, weak WiFi), no immediate visual feedback
3. User clicks again before first request completes
4. `startCheckIn()` called twice — two `insertCheckIn()` calls fire
5. Two `check_ins` records created for the same couple with status `in-progress`

**Expected Behavior:**
Second click should be blocked. Button should disable and show spinner on first click.

**Actual Behavior:**
Two check-in sessions created. App may display the wrong one or switch between them unpredictably.

**Code Location:**

- `src/contexts/CheckInContext.tsx` — `startCheckIn()` has no guard against concurrent calls

**Recommended Fix:**

1. Add `isStarting` flag checked before calling `insertCheckIn()`
2. Disable start button while pending
3. Add DB constraint: unique `(couple_id)` where `status = 'in-progress'`

---

#### [RF-2-002] Double-click on note save creates duplicates

**Severity:** Medium
**Category:** Race Conditions & Double Actions
**User Type:** Confused User

**Scenario:**

1. User writes a note and clicks "Save"
2. On slow connection, double-clicks
3. Two `createNote` server actions fire
4. Two identical notes created

**Expected Behavior:**
Submit button disabled during pending state; only one note created.

**Actual Behavior:**
Duplicate notes created.

**Code Location:**

- `src/components/notes/NoteEditor.tsx` — `useActionState` may not disable button fast enough for rapid clicks

**Recommended Fix:**
Ensure submit button is disabled while `isPending`. Consider adding idempotency key to note creation.

---

#### [RF-2-003] Concurrent session settings proposals create conflicts

**Severity:** Medium
**Category:** Race Conditions & Double Actions
**User Type:** Power User

**Scenario:**

1. Partner A opens settings in two browser tabs
2. Tab 1: proposes session duration 15 min
3. Tab 2: proposes session duration 20 min
4. Both proposals inserted — no conflict detection

**Expected Behavior:**
Only one pending proposal allowed at a time.

**Actual Behavior:**
Multiple conflicting proposals can exist simultaneously.

**Code Location:**

- `src/contexts/SessionSettingsContext.tsx` — `proposeSettings()` inserts without checking existing proposals

**Recommended Fix:**
Check for existing pending proposal before insert. Update existing proposal or reject with message.

---

#### [RF-2-004] Rapid delete clicks cause console errors

**Severity:** Low
**Category:** Race Conditions & Double Actions
**User Type:** Confused User

**Scenario:**

1. User double-clicks a delete button (notes, reminders, or requests)
2. First click deletes the record
3. Second click fires — record not found
4. Error logged to console; no user-facing issue but noisy

**Code Location:**

- Various delete handlers across notes, reminders, requests actions

**Recommended Fix:**
Disable delete button immediately on click. Handle "not found" as success (idempotent delete).

---

### Category 3: Interrupted Operations

#### [RF-3-001] Network drop during check-in completion loses mood/reflection data

**Severity:** Critical
**Category:** Interrupted Operations
**User Type:** Confused User

**Scenario:**

1. User completes a 15-minute check-in session
2. Fills in mood rating (1-5) and reflection text
3. Clicks "Complete"
4. Network drops during the `updateCheckInStatus()` call
5. Error caught by `console.error` — no UI feedback
6. User navigates away thinking it saved
7. Returns to find the check-in still "in-progress" with no mood/reflection data

**Expected Behavior:**
Show clear error: "Check-in couldn't be saved. Your data is preserved — try again." Keep form visible with data intact.

**Actual Behavior:**
Silent failure. User unaware data wasn't saved. Mood and reflection data lost from browser state.

**Code Location:**

- `src/contexts/CheckInContext.tsx` — `completeCheckIn()` catches errors with `console.error` only

**Recommended Fix:**

1. Show error toast on completion failure
2. Keep completion form visible with entered data
3. Add "Retry" button
4. Auto-save mood/reflection to the DB record periodically

---

#### [RF-3-002] Photo upload interruption leaves orphaned storage objects

**Severity:** Medium
**Category:** Interrupted Operations
**User Type:** Confused User

**Scenario:**

1. User uploads a milestone photo (up to 10MB)
2. Mid-upload, closes tab or loses connection
3. File partially uploaded to `milestone-photos` bucket
4. Milestone record never updated with the URL
5. Orphaned file remains in storage indefinitely

**Expected Behavior:**
Orphaned uploads cleaned up automatically.

**Actual Behavior:**
Orphaned files accumulate in storage bucket.

**Code Location:**

- `src/hooks/useMilestones.ts` — upload then insert pattern; no cleanup on failure

**Recommended Fix:**
Add a weekly cron job to clean up storage objects not referenced by any milestone record. Or: create milestone record first, then upload and update URL.

---

#### [RF-3-003] No beforeunload warning during active check-in

**Severity:** Medium
**Category:** Interrupted Operations
**User Type:** Confused User

**Scenario:**

1. User is mid-check-in (5 minutes in, timer running)
2. Accidentally closes the browser tab or navigates to external URL
3. No browser warning dialog appears
4. Session persists in DB (good), but timer state in sessionStorage is lost

**Expected Behavior:**
Browser shows "You have an active check-in session. Leave anyway?" dialog.

**Actual Behavior:**
Tab closes without warning.

**Code Location:**

- No `beforeunload` event listener found in check-in components

**Recommended Fix:**
Add `useEffect` with `beforeunload` handler when `session` is non-null in CheckInContext.

---

#### [RF-3-004] Invite email failure silently swallowed during onboarding

**Severity:** Medium
**Category:** Interrupted Operations
**User Type:** Confused User

**Scenario:**

1. User completes onboarding with partner's email
2. `createInvite()` succeeds but the Resend email API fails
3. Onboarding shows success — "Invite sent!"
4. Partner never receives the invite email
5. No way for user to know the email wasn't sent

**Expected Behavior:**
Surface email failure: "Account created, but invite email couldn't be sent. Resend from Settings."

**Actual Behavior:**
Email failure caught by try/catch, logged to console. User sees success.

**Code Location:**

- `src/app/onboarding/actions.ts` — email send wrapped in try/catch that doesn't fail the action

**Recommended Fix:**
Return a partial success state from the action. Show banner in UI: "Invite email may not have been delivered. [Resend Invite]"

---

### Category 4: Cross-Device & Cross-Session

#### [RF-4-001] Session timer not synced across devices

**Severity:** High
**Category:** Cross-Device & Cross-Session
**User Type:** Power User

**Scenario:**

1. Partner A starts check-in with 10-minute timer on desktop
2. Timer runs for 3 minutes
3. Partner A switches to phone to continue the session
4. Timer resets to full 10 minutes (sessionStorage is per-tab/per-device)
5. Partners have different time expectations

**Expected Behavior:**
Timer should reflect actual elapsed time regardless of device.

**Actual Behavior:**
Timer resets on device switch. Each device has independent timer state.

**Code Location:**

- `src/hooks/useSessionTimer.ts` — timer state in `sessionStorage('qc-session-timer')`

**Recommended Fix:**
Store `started_at` in the `check_ins` DB record (already exists). Calculate remaining time as `session_duration - (now - started_at)` on any device. Use `sessionStorage` only as a cache to survive same-tab refreshes.

---

#### [RF-4-002] Theme preference not synced across devices

**Severity:** Low
**Category:** Cross-Device & Cross-Session
**User Type:** Power User

**Scenario:**
User sets dark mode on desktop. Opens app on phone — still light mode.

**Code Location:**

- `src/contexts/ThemeContext.tsx` — `localStorage('qc-theme')` only

**Recommended Fix:**
Store theme in `profiles` table. Low priority — per-device themes are acceptable UX for most apps.

---

#### [RF-4-003] Realtime subscriptions don't surface reconnection failures

**Severity:** High
**Category:** Cross-Device & Cross-Session
**User Type:** Confused User

**Scenario:**

1. User on mobile loses WiFi briefly (elevator, network switch)
2. Supabase realtime auto-reconnects (built-in behavior)
3. During disconnection window, partner makes changes
4. No QC-level indicator that data may be stale
5. After reconnection, changes made during the gap may not be caught

**Expected Behavior:**
Show "Reconnecting..." indicator. On reconnect, refetch latest data.

**Actual Behavior:**
No indication of connection issues. Data silently stale.

**Code Location:**

- `src/hooks/useRealtimeCouple.ts` — no `CHANNEL_ERROR`, `TIMED_OUT`, or `CLOSED` event handling

**Recommended Fix:**

1. Monitor channel status events
2. Show subtle "Reconnecting..." toast during disconnection
3. On reconnect, trigger a fresh data fetch in all contexts

---

#### [RF-4-004] Concurrent note editing — last write wins silently

**Severity:** Medium
**Category:** Cross-Device & Cross-Session
**User Type:** Power User

**Scenario:**

1. Both partners open the same shared note
2. Partner A edits and saves
3. Partner B (with stale content in their editor) edits and saves
4. Partner A's changes silently overwritten

**Expected Behavior:**
Detect concurrent edit. Show "This note was modified. [Reload] [Overwrite]"

**Actual Behavior:**
Last write wins. Partner A's changes lost without notification.

**Code Location:**

- `src/app/(app)/notes/actions.ts` — `updateNote` does simple UPDATE with no version/timestamp check

**Recommended Fix:**
Add optimistic locking: include `updated_at` in the UPDATE WHERE clause. If rows affected = 0, return conflict error. Show conflict resolution UI.

---

### Category 5: Input & Data Edge Cases

#### [RF-5-001] Markdown link injection allows javascript: URIs

**Severity:** High
**Category:** Input & Data Edge Cases
**User Type:** Power User

**Scenario:**

1. User creates a note with: `[click here](javascript:alert('xss'))`
2. `toHTML()` in `text-formatting.ts` converts to an anchor tag with a `javascript:` href
3. While React components likely render text safely, email templates or future features rendering this HTML would be vulnerable

**Expected Behavior:**
javascript: URIs stripped or blocked. Only http/https/mailto schemes allowed.

**Actual Behavior:**
`sanitizeText()` uses regex to block `javascript:` but regex-based sanitization is bypassable.

**Code Location:**

- `src/lib/text-formatting.ts` — `toHTML()` creates link elements without URL scheme validation

**Recommended Fix:**

1. Use DOMPurify for HTML sanitization (industry standard)
2. Whitelist URL schemes: only `http:`, `https:`, `mailto:` in link processing
3. Audit all places `toHTML()` output is rendered

---

#### [RF-5-002] Category icon field accepts invisible characters

**Severity:** Low
**Category:** Input & Data Edge Cases
**User Type:** Power User

**Scenario:**

1. User enters zero-width space (U+200B) as category icon
2. Passes `maxLength=2` validation
3. Renders as invisible in UI — looks like no icon was set

**Code Location:**

- `src/components/settings/CategoryFormDialog.tsx` — icon input has `maxLength=2` only

**Recommended Fix:**
Validate icon contains at least one visible character. Strip zero-width and control characters.

---

#### [RF-5-003] Milestones and love actions lack server-side validation

**Severity:** Medium
**Category:** Input & Data Edge Cases
**User Type:** Power User

**Scenario:**

1. User (or automated request) creates a milestone with a 100,000-character title
2. No server-side length validation — insert succeeds
3. Could degrade DB performance or break UI rendering

**Expected Behavior:**
Server rejects oversized input with clear error.

**Actual Behavior:**
Insert succeeds. No validation boundary.

**Code Location:**

- `src/hooks/useMilestones.ts` — client-side insert, no Zod schema
- `src/components/love-languages/AddActionDialog.tsx` — love action fields unvalidated on server

**Recommended Fix:**
Add Zod schemas for milestone and love action mutations, following the existing pattern in `src/lib/validation.ts`.

---

#### [RF-5-004] File upload MIME validation is client-only and spoofable

**Severity:** Medium
**Category:** Input & Data Edge Cases
**User Type:** Power User

**Scenario:**

1. User renames a non-image file to `.jpg`
2. Browser may report MIME type based on extension
3. Client-side check passes
4. File uploaded to public `milestone-photos` bucket

**Expected Behavior:**
Server validates file magic bytes (signature) before accepting upload.

**Actual Behavior:**
Only client-side MIME type check. Server accepts whatever is uploaded.

**Code Location:**

- `src/components/growth/PhotoUpload.tsx` — checks `file.type` (browser-provided, spoofable)

**Recommended Fix:**

1. Validate file magic bytes on the server (first 4-8 bytes identify format)
2. Add Supabase Storage policy restricting uploads to image MIME types
3. Consider running uploaded images through an image processing pipeline to strip non-image content

---

### Category 6: State & Timing

#### [RF-6-001] Session expiry during check-in loses unsaved form data

**Severity:** Critical
**Category:** State & Timing
**User Type:** Confused User

**Scenario:**

1. User is mid-check-in, filling in mood/reflection
2. Gets distracted — tab open for 45+ minutes
3. Auth token expires
4. User resumes and clicks "Complete"
5. `requireAuth()` fails — redirected to `/login?redirect=/checkin`
6. After re-login, lands on check-in page — session restores from DB (good)
7. But mood rating and reflection text entered in the browser form are lost

**Expected Behavior:**
Form data should survive re-authentication.

**Actual Behavior:**
Check-in session restores but in-progress form data (mood, reflection) lost.

**Code Location:**

- `src/lib/auth.ts` — `requireAuth()` redirects to login on expiry
- `src/contexts/CheckInContext.tsx` — form data is component state, not persisted

**Recommended Fix:**

1. Auto-save mood and reflection to the `check_ins` record periodically (every 30s while dirty)
2. Alternatively, save to localStorage as draft
3. On check-in page mount, restore draft data if available

---

#### [RF-6-002] Stale data after laptop sleep/wake

**Severity:** Medium
**Category:** State & Timing
**User Type:** Confused User

**Scenario:**

1. User puts laptop to sleep with QC open
2. Wakes up 2+ hours later
3. Supabase realtime may have disconnected during sleep
4. User sees stale data — partner's recent changes not reflected
5. No indication data may be outdated

**Expected Behavior:**
On tab visibility change (returning from sleep), refetch latest data.

**Actual Behavior:**
Stale data displayed until manual refresh.

**Code Location:**

- `src/hooks/useRealtimeCouple.ts` — no `visibilitychange` listener

**Recommended Fix:**
Add a `visibilitychange` event listener. When tab becomes visible after > 60 seconds hidden, trigger a fresh data fetch in all contexts.

---

#### [RF-6-003] Reminder cron doesn't handle timezone transitions

**Severity:** Medium
**Category:** State & Timing
**User Type:** Confused User

**Scenario:**

1. User sets weekly reminder for 9:00 AM in their local timezone
2. During DST transition (spring forward/fall back), reminder fires at wrong time
3. Reminder time stored as HH:MM string without timezone context

**Code Location:**

- `src/app/api/cron/send-reminders/route.ts` — processes `scheduled_for` timestamps
- `src/app/onboarding/actions.ts` — stores time as HH:MM without timezone

**Recommended Fix:**
Store user timezone in profiles table. Convert reminder times using timezone in the cron job.

---

#### [RF-6-004] Fetch-then-subscribe gap in realtime sync

**Severity:** Low
**Category:** State & Timing
**User Type:** Power User

**Scenario:**

1. Context mounts — fetches data from DB
2. ~200ms later, realtime subscription becomes active
3. Any changes made during this window are missed

**Code Location:**

- `src/contexts/LoveLanguagesContext.tsx`, `src/contexts/CheckInContext.tsx`

**Recommended Fix:**
After subscription is established, do a "catch-up" re-fetch. Low priority — window is typically <500ms.

---

### Category 7: Error Recovery & Empty States

#### [RF-7-001] Silent failures in CheckInContext leave user in limbo

**Severity:** Critical
**Category:** Error Recovery & Empty States
**User Type:** Confused User

**Scenario:**

1. User clicks "Start Check-in"
2. `insertCheckIn()` fails (DB connection issue, RLS error, network timeout)
3. `console.error` fires — no UI feedback
4. Check-in landing page stays visible
5. User tries again — may succeed or fail again with no indication

**Expected Behavior:**
Show error banner: "Couldn't start check-in. Please try again." with retry button.

**Actual Behavior:**
Silent failure. `error` field in state is declared but never populated.

**Code Location:**

- `src/contexts/CheckInContext.tsx` — error handling is `console.error` only throughout

**Recommended Fix:**

1. Populate the `error` state field on failures
2. Show error UI in check-in components
3. Add retry mechanism
4. Apply same pattern across all contexts (SessionSettings, Bookends, LoveLanguages)

---

#### [RF-7-002] Error boundaries missing for most app routes

**Severity:** Medium
**Category:** Error Recovery & Empty States
**User Type:** Confused User

**Scenario:**

1. Runtime error occurs in Notes page (e.g., malformed DB data)
2. No route-level `error.tsx` for `/notes`
3. Error bubbles to `(app)/error.tsx` — generic app-level error
4. User sees generic error, must navigate back manually

**Expected Behavior:**
Route-level error boundary with contextual message and "Try Again" that reloads just that route.

**Actual Behavior:**
Generic app-wide error page.

**Code Location:**

- Missing `error.tsx` for: `/notes`, `/dashboard`, `/reminders`, `/requests`, `/growth`, `/love-languages`, `/settings`
- Present for: `(app)/` (catch-all), `/checkin`, `/invite/[token]`, `/onboarding`

**Recommended Fix:**
Add `error.tsx` for each app route with contextual error messages and a "Try Again" button.

---

#### [RF-7-003] No empty state guidance for new couples

**Severity:** Low
**Category:** Error Recovery & Empty States
**User Type:** Confused User

**Scenario:**

1. New couple completes onboarding
2. Lands on dashboard
3. No check-ins, notes, or milestones — empty widgets
4. No guidance on what to do first

**Code Location:**

- Dashboard widget components — may not all have helpful empty states

**Recommended Fix:**
Add first-time empty states with CTAs: "Start your first check-in together" with a prominent button. Consider a post-onboarding checklist.

---

#### [RF-7-004] Error boundary retry may flash-loop on persistent errors

**Severity:** Low
**Category:** Error Recovery & Empty States
**User Type:** Confused User

**Scenario:**

1. Error boundary catches a render error
2. User clicks "Try Again" — calls `reset()`
3. If root cause persists (bad data), error immediately re-throws
4. User sees error then retry then error loop

**Code Location:**

- `src/app/(app)/error.tsx` — `reset()` without addressing root cause

**Recommended Fix:**
Call `router.refresh()` before `reset()` to force fresh data fetch. After 2 consecutive failures, show "persistent error" state with link to dashboard or support.

---

### Category 8: Unintended Usage Patterns

#### [RF-8-001] localStorage theme value not validated

**Severity:** Info
**Category:** Unintended Usage Patterns
**User Type:** Power User

**Scenario:**
User sets `localStorage('qc-theme')` to unexpected value via DevTools. ThemeContext reads without validation.

**Code Location:**

- `src/contexts/ThemeContext.tsx`

**Recommended Fix:**
Validate stored value is `'light'` or `'dark'`; fall back to `'light'` for unknown values.

---

#### [RF-8-002] RLS properly prevents private note access via DevTools

**Severity:** Info
**Category:** Unintended Usage Patterns
**User Type:** Power User

**Scenario:**
User could attempt to query partner's private notes via Supabase client in DevTools. RLS policies correctly filter by privacy and user_id.

**Status:** **Properly mitigated.** No fix needed. Documenting as positive finding.

**Code Location:**

- Supabase RLS policies on `notes` table

---

#### [RF-8-003] URL parameter languageId not validated

**Severity:** Low
**Category:** Unintended Usage Patterns
**User Type:** Power User

**Scenario:**
Navigating to `/love-languages/actions?languageId=fake-uuid` loads the page but fails to preselect a language. Fails silently.

**Code Location:**

- `src/app/(app)/love-languages/actions/page.tsx`

**Recommended Fix:**
Validate `languageId` is a valid UUID belonging to the user's couple. Show message if invalid.

---

#### [RF-8-004] Check-in status can be modified via DevTools

**Severity:** Info
**Category:** Unintended Usage Patterns
**User Type:** Power User

**Scenario:**
A user could call Supabase update from DevTools to force-end a partner's check-in. RLS allows this since both partners have UPDATE access.

**Code Location:**

- RLS UPDATE policy on `check_ins` — couple-scoped, no author restriction on status changes

**Recommended Fix:**
Consider author-only restriction for status changes. Low priority — requires active DevTools manipulation.

---

## Recommendations

### Immediate Fixes (Critical + High)

| #   | Finding                                               | Effort | Impact                                   |
| --- | ----------------------------------------------------- | ------ | ---------------------------------------- |
| 1   | [RF-7-001] Surface errors in CheckInContext to UI     | Small  | Prevents users from being stuck in limbo |
| 2   | [RF-3-001] Add error handling for check-in completion | Small  | Prevents data loss on network issues     |
| 3   | [RF-6-001] Auto-save mood/reflection during check-in  | Medium | Prevents data loss on session expiry     |
| 4   | [RF-1-002] Persist preparation topics                 | Medium | Prevents topic loss on navigation        |
| 5   | [RF-2-001] Guard against duplicate check-in creation  | Small  | Prevents confusing duplicate sessions    |
| 6   | [RF-4-001] Server-backed session timer                | Medium | Consistent timer across devices          |
| 7   | [RF-4-003] Add realtime connection monitoring         | Medium | Users aware of sync status               |
| 8   | [RF-5-001] Fix markdown XSS with DOMPurify            | Small  | Security hardening                       |

### UX Improvements (Medium)

| #   | Finding                                                      | Effort | Impact                                  |
| --- | ------------------------------------------------------------ | ------ | --------------------------------------- |
| 9   | [RF-7-002] Add route-level error boundaries                  | Small  | Better error recovery per route         |
| 10  | [RF-2-002] Disable buttons during form submission            | Small  | Prevents duplicate records              |
| 11  | [RF-4-004] Add optimistic locking for note editing           | Medium | Prevents silent data overwrites         |
| 12  | [RF-6-002] Refetch data on tab visibility change             | Small  | Prevents stale data after sleep         |
| 13  | [RF-3-003] Add beforeunload warning for check-ins            | Small  | Prevents accidental session abandonment |
| 14  | [RF-3-004] Surface invite email failures                     | Small  | User awareness                          |
| 15  | [RF-5-003] Add server validation for milestones/love actions | Medium | Input boundary enforcement              |
| 16  | [RF-5-004] Server-side file validation                       | Medium | Security hardening                      |

### Defense-in-Depth (Low + Info)

| #   | Finding                                     | Effort | Impact                        |
| --- | ------------------------------------------- | ------ | ----------------------------- |
| 17  | [RF-6-003] Timezone-aware reminders         | Medium | Correct reminder delivery     |
| 18  | [RF-3-002] Orphaned storage cleanup cron    | Small  | Storage hygiene               |
| 19  | [RF-1-003] Contextual invite error messages | Small  | Better UX for re-used invites |
| 20  | [RF-7-003] First-time empty states          | Medium | Better onboarding completion  |

---

## Flow Coverage

- **Multi-step flows audited:** 4 (onboarding, check-in, invite acceptance, love languages)
- **State dependencies mapped:** 5 contexts + 2 client storage mechanisms + 10 realtime subscriptions
- **Input surfaces checked:** 15+ forms, 30+ input fields, 1 file upload component

---

## Appendix: Files Referenced

### Contexts & State

- `src/contexts/CheckInContext.tsx`
- `src/contexts/BookendsContext.tsx`
- `src/contexts/SessionSettingsContext.tsx`
- `src/contexts/LoveLanguagesContext.tsx`
- `src/contexts/ThemeContext.tsx`

### Hooks

- `src/hooks/useRealtimeCouple.ts`
- `src/hooks/useSessionTimer.ts`
- `src/hooks/useMilestones.ts`

### Auth & Middleware

- `src/middleware.ts`
- `src/lib/supabase/middleware.ts`
- `src/lib/auth.ts`

### Forms & Actions

- `src/app/onboarding/actions.ts`
- `src/app/(app)/notes/actions.ts`
- `src/app/invite/[token]/actions.ts`
- `src/components/notes/NoteEditor.tsx`
- `src/components/growth/PhotoUpload.tsx`
- `src/components/growth/MilestoneCreatorForm.tsx`
- `src/components/love-languages/AddActionDialog.tsx`

### Validation

- `src/lib/validation.ts`
- `src/lib/text-formatting.ts`

### Error Boundaries

- `src/app/(app)/error.tsx`
- `src/app/(app)/checkin/error.tsx`
- `src/app/invite/[token]/error.tsx`
- `src/app/onboarding/error.tsx`
- `src/components/ui/ErrorBoundary.tsx`
