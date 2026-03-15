# Adversarial Audit Report — QC (Quality Couple)

**Date:** 2026-03-14
**Scope:** Full audit (all 7 categories)
**App:** QC — relationship wellness app for couples
**Stack:** Next.js 16, Supabase (Postgres + RLS), Resend email, Vercel serverless
**Interactive verification:** No

---

## Executive Summary

QC has **strong authentication and authorization** — every server action uses `requireAuth()`, all 16 tables have RLS enabled with couple-scoped policies, and invite tokens use cryptographically random UUIDs with expiration. The core security boundary (couple-scoped data isolation) is well-enforced.

However, the app has **no usage quotas or rate limiting on resource creation**, which creates significant cost amplification and resource exhaustion risks. The most critical gap is that unlimited reminder creation feeds directly into the daily cron job, which sends unbounded emails via Resend at $0.20 each.

**Total findings:** 18 (3 Critical, 5 High, 6 Medium, 3 Low, 1 Info)

---

## Economic Surface Map

### Cost-Bearing Resources

| Resource | Provider | Unit Cost | Triggered By | Rate Limited? |
|----------|----------|-----------|-------------|--------------|
| Invite email | Resend | $0.20 | Onboarding / resend | No |
| Request notification email | Resend | $0.20 | Create request | No |
| Milestone email | Resend | $0.40 (both partners) | Create milestone | No |
| Check-in summary email | Resend | $0.40 (both partners) | Complete check-in | No |
| Reminder email (cron) | Resend | $0.20 | Daily cron per reminder | No |
| Photo storage | Supabase | ~$0.15/GB/month | Milestone photo upload | No |
| DB queries | Supabase | Included (plan-based) | Every page load | No |
| Realtime connections | Supabase | Included (plan-based) | Session start (~10 per user) | No |

### Third-Party Services

- **Resend** — transactional email (invite, request, milestone, check-in, reminder)
- **Supabase** — database, storage, realtime, auth
- **Vercel** — hosting, serverless functions, cron

### Unmetered Resources

All data creation endpoints are unlimited: notes, reminders, milestones, requests, check-ins, action items, love languages, love actions. No per-couple or per-user caps exist anywhere in the system.

---

## Findings

### Category 1: Quota & Limit Bypass

#### 1.1 No Usage Caps on Any Data Table [CRITICAL]

- **Actor:** Bad actor / Power user
- **Scenario:** A user creates thousands of notes, reminders, milestones, requests, or action items via the app's server actions. No database constraints, application limits, or rate limiting prevents this.
- **Affected code:**
  - `src/app/(app)/notes/actions.ts` — `createNote()` has no per-user limit
  - `src/app/(app)/reminders/actions.ts` — `createReminder()` has no per-couple limit
  - `src/app/(app)/requests/actions.ts` — `createRequest()` has no per-couple limit
  - `supabase/migrations/00004_checkins_notes_actions.sql` — no row count constraints
  - `supabase/migrations/00006_reminders_requests.sql` — no row count constraints
- **Current protection:** None
- **Impact:** Database bloat, degraded query performance, potential Supabase plan limits exceeded
- **Recommended fix:** Add per-couple row limits via database trigger or application-level checks (e.g., max 500 notes, max 50 active reminders, max 100 milestones per couple)

#### 1.2 No Per-Couple Storage Quota [HIGH]

- **Actor:** Bad actor
- **Scenario:** User uploads milestone photos repeatedly, consuming Supabase storage. No per-couple or system-wide storage quota is enforced.
- **Affected code:**
  - `src/hooks/useMilestones.ts:62-82` — upload logic with client-side 10MB limit only
  - `supabase/migrations/00005_milestones.sql:25-41` — storage policies allow authenticated upload
- **Current protection:** Client-side file size check (10MB) — trivially bypassed
- **Impact:** Storage costs increase unboundedly
- **Recommended fix:** Enforce storage quota via Supabase bucket policies or server-side middleware. Add per-couple storage limit (e.g., 500MB).

#### 1.3 Asymmetric Create/Delete Limits [MEDIUM]

- **Actor:** Confused user
- **Scenario:** Bulk delete is capped at 50 notes per request (`notes/actions.ts`), but creation has no cap. A user who creates thousands of notes faces a painful cleanup process.
- **Affected code:** `src/app/(app)/notes/actions.ts` — `bulkDeleteNotes()` validates max 50 IDs
- **Current protection:** Partial (delete limit exists, create limit does not)
- **Impact:** Poor UX, accumulated data
- **Recommended fix:** Add creation limits to match the system's ability to manage data at scale

---

### Category 2: Cost Amplification

#### 2.1 Unbounded Reminder Email Amplification [CRITICAL]

- **Actor:** Bad actor
- **Scenario:** User creates 1,000 active reminders with `notification_channel: 'email'`. The daily cron job (`api/cron/send-reminders/route.ts`) fetches ALL active reminders system-wide and sends one email per reminder. This costs $200/day in Resend fees and scales linearly with reminder count.
- **Affected code:**
  - `src/app/(app)/reminders/actions.ts` — `createReminder()` with no limit
  - `src/app/api/cron/send-reminders/route.ts:27-32` — unbounded query fetches all active reminders
  - `src/lib/email/send.ts:48-71` — batch send with no total cap
- **Current protection:** None. Cron auth (CRON_SECRET) is valid but doesn't limit volume.
- **Impact:** Direct revenue loss ($0.20 × reminders × days). A single bad actor can cost hundreds per day.
- **Recommended fix:**
  1. Cap reminders per couple (e.g., max 20 active reminders)
  2. Cap emails per cron invocation (e.g., max 100)
  3. Add per-couple daily email limit
  4. Paginate the cron reminder query

#### 2.2 Notification Email Spam via Feature Abuse [HIGH]

- **Actor:** Bad actor / Power user
- **Scenario:** Each request, milestone, and check-in completion sends notification emails to the partner. A user creating 100 requests in rapid succession triggers 100 partner notification emails.
- **Affected code:**
  - `src/app/(app)/requests/actions.ts:26-94` — `createRequest()` sends email per request
  - `src/app/(app)/growth/actions.ts:7-49` — `sendMilestoneEmail()` sends to both partners
  - `src/app/(app)/checkin/actions.ts:22-75` — `sendCheckInSummaryEmail()` sends to both partners
- **Current protection:** `shouldSendEmail()` respects bounces/complaints but doesn't throttle volume
- **Impact:** Partner receives email flood; Resend costs accumulate
- **Recommended fix:** Per-couple email throttle (e.g., max 10 notification emails per hour)

#### 2.3 Invite Resend Has No Rate Limit [HIGH]

- **Actor:** Confused user / Bad actor
- **Scenario:** User repeatedly clicks "Resend invite" in settings. Each click sends a new email to the partner's address with no cooldown.
- **Affected code:** `src/app/(app)/settings/actions/profile.ts:54-103` — `resendInviteAction()`
- **Current protection:** `shouldSendEmail()` checks bounce/complaint flags only
- **Impact:** Partner email spam, Resend costs
- **Recommended fix:** Add cooldown (e.g., 1 resend per 5 minutes, max 5 per day)

---

### Category 3: Account & Identity Abuse

#### 3.1 Couple Orphaning via Leave/Rejoin Cycle [MEDIUM]

- **Actor:** Confused user
- **Scenario:** User leaves couple via settings → gets redirected to onboarding → creates new couple. Old couple's data (notes, check-ins, milestones) remains in DB, accessible only to the remaining partner. If both partners leave, data is fully orphaned.
- **Affected code:**
  - `src/app/(app)/settings/actions/profile.ts` — `leaveCoupleAction()` sets `couple_id = NULL`
  - `src/lib/couples.ts` — `leaveCouple()` does not cascade-delete couple data
- **Current protection:** None. No cleanup triggers.
- **Impact:** DB bloat from orphaned couples and their associated data
- **Recommended fix:** Add soft-delete with retention policy. When both partners leave, schedule couple data for deletion after 30 days.

#### 3.2 Multiple Couple Creation [LOW]

- **Actor:** Confused user
- **Scenario:** A user without a `couple_id` can call `createCouple()` multiple times (e.g., by refreshing onboarding). Each call creates a new couple via the `create_couple_for_user` RPC, orphaning any previous couple.
- **Affected code:** `src/lib/couples.ts:9-36` — `createCouple()` uses RPC, no check for existing couple
- **Current protection:** DB trigger limits couple members to 2, but doesn't prevent creating new couples
- **Impact:** Orphaned couple rows accumulate
- **Recommended fix:** Check if user already has a couple before creating; add unique constraint or application guard

---

### Category 4: State Corruption

#### 4.1 Missing UPDATE RLS Policy on session_settings [MEDIUM]

- **Actor:** Power user
- **Scenario:** The `session_settings` table (migration 00008) has SELECT and INSERT policies but no explicit UPDATE policy. Depending on Postgres default behavior, this could either block legitimate updates or allow unintended ones.
- **Affected code:** `supabase/migrations/00008_session_settings.sql`
- **Current protection:** Partial — SELECT and INSERT policies exist
- **Impact:** Couples may be unable to update session settings, or updates may bypass couple-scoping
- **Recommended fix:** Add explicit UPDATE policy: `USING (couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid())) WITH CHECK (same)`

#### 4.2 Missing DELETE Policies on 3 Tables [MEDIUM]

- **Actor:** Power user
- **Scenario:** `couple_invites`, `session_settings_proposals`, and `subscriptions` lack DELETE RLS policies. Users cannot delete rows from these tables via the Supabase client.
- **Affected code:**
  - `supabase/migrations/00003_couples_and_profiles.sql` — `couple_invites`
  - `supabase/migrations/00014_session_settings_proposals.sql` — `session_settings_proposals`
- **Current protection:** RLS blocks all deletes (no policy = default deny)
- **Impact:** May be intentional (audit trail), but prevents cleanup of stale data
- **Recommended fix:** If deletion should be allowed, add couple-scoped DELETE policies. If intentional, document the decision.

#### 4.3 Orphaned Couple Data Never Cleaned Up [LOW]

- **Actor:** Confused user
- **Scenario:** When users leave couples, the couple entity and all associated data remain indefinitely. No background job or trigger cleans up fully-orphaned couples (where no user has the `couple_id`).
- **Affected code:** `src/lib/couples.ts` — `leaveCouple()` only nulls `couple_id`
- **Current protection:** None
- **Impact:** Slow DB bloat over time
- **Recommended fix:** Scheduled job to identify and soft-delete couples with no active members

---

### Category 5: Subscription & Billing Gaps

#### 5.1 No Billing System — Future Monetization Risk [INFO]

- **Actor:** N/A
- **Scenario:** QC currently has no pricing tiers, subscriptions, or billing integration. All features are free. If monetization is added later, retroactive quota enforcement will be needed, and existing users with large datasets may need migration paths.
- **Current protection:** N/A
- **Impact:** Future architectural work needed
- **Recommended fix:** When adding billing, implement quotas at the database level (triggers) rather than application level to prevent bypass

---

### Category 6: Resource Exhaustion

#### 6.1 Client-Side Photo Size Validation Only [CRITICAL]

- **Actor:** Bad actor
- **Scenario:** Photo upload validates file size (5-10MB) only in the client-side `PhotoUpload.tsx` component. An attacker can bypass this by calling the Supabase storage API directly, uploading arbitrarily large files to the `milestone-photos` bucket.
- **Affected code:**
  - `src/components/growth/PhotoUpload.tsx:146-177` — client-side validation
  - `src/hooks/useMilestones.ts:60` — `MAX_PHOTO_SIZE = 10 * 1024 * 1024`
  - `supabase/migrations/00005_milestones.sql:25-41` — no size restriction in bucket policies
- **Current protection:** Client-side only (trivially bypassed)
- **Impact:** Supabase storage exhaustion, increased hosting costs
- **Recommended fix:** Add server-side file size validation via Supabase bucket configuration (`file_size_limit`) or a server-side upload endpoint that validates before forwarding to storage

#### 6.2 Unbounded Streak Calculation Query [HIGH]

- **Actor:** Power user (unintentional)
- **Scenario:** The streak calculation in `lib/streaks.ts:122-138` fetches ALL completed check-ins for a couple with no LIMIT clause. For couples with thousands of check-ins, this loads all rows into memory on every dashboard visit.
- **Affected code:** `src/lib/streaks.ts:122-138` — `SELECT completed_at FROM check_ins WHERE couple_id = ? AND status = 'completed'`
- **Current protection:** None
- **Impact:** Slow dashboard loads, high memory usage on serverless functions, potential timeouts
- **Recommended fix:** Add `.limit(365)` or calculate streaks incrementally (store last streak date)

#### 6.3 Unbounded Cron Reminder Query [HIGH]

- **Actor:** System (amplified by bad actor creating many reminders)
- **Scenario:** The reminder cron job queries ALL active reminders system-wide with no pagination. As the user base grows, this query becomes increasingly expensive and the email batch grows unboundedly.
- **Affected code:** `src/app/api/cron/send-reminders/route.ts:27-32`
- **Current protection:** None
- **Impact:** Cron job timeout, excessive email sends, Resend API rate limits hit
- **Recommended fix:** Paginate query (process 100 reminders per invocation), add system-wide email cap per cron run

---

### Category 7: Unprotected Edge Cases

#### 7.1 Activity Feed Relies Solely on RLS for Note Privacy [MEDIUM]

- **Actor:** N/A (defensive gap)
- **Scenario:** The activity feed in `lib/activity.ts` queries notes without selecting the `privacy` or `author_id` fields. It relies entirely on RLS to filter out private notes. If RLS is ever misconfigured or disabled (e.g., during debugging), private notes would leak into the partner's activity feed.
- **Affected code:** `src/lib/activity.ts:10-120` — notes query selects `content, created_at` only
- **Current protection:** RLS policy correctly filters `(privacy != 'private' OR author_id = auth.uid())`
- **Impact:** Privacy violation if RLS is ever weakened
- **Recommended fix:** Add application-level privacy filter as defense-in-depth: select `privacy, author_id` and filter client-side

#### 7.2 In-Memory Rate Limiter Ineffective on Serverless [MEDIUM]

- **Actor:** Bad actor
- **Scenario:** The rate limiter (`lib/rate-limit.ts`) uses an in-memory `Map` that resets on every serverless cold start. On Vercel, functions idle after ~5 minutes, meaning the rate limiter provides only brief burst protection, not sustained rate limiting.
- **Affected code:**
  - `src/lib/rate-limit.ts:12` — `new Map<string, RateLimitEntry>()`
  - `src/app/invite/[token]/actions.ts:14` — rate limiter on invite validation
  - `src/app/api/email/webhook/route.ts:7` — rate limiter on webhook
- **Current protection:** Partial — works within a single warm instance
- **Impact:** Invite token enumeration, webhook flooding after cold start
- **Recommended fix:** Use persistent rate limiting (Redis via Upstash, or Supabase-backed counter) or Vercel's Edge Config for rate state

#### 7.3 Unbounded Realtime Subscriptions Per User [LOW]

- **Actor:** Confused user
- **Scenario:** Each page/context mounts its own Supabase Realtime subscription (~10 per session). Opening multiple browser tabs multiplies this. No connection limit is enforced.
- **Affected code:** `src/hooks/useRealtimeCouple.ts:29-77` — subscription per hook instance
- **Current protection:** Cleanup on unmount (`supabase.removeChannel()`)
- **Impact:** Supabase Realtime connection limits hit on free/pro plans
- **Recommended fix:** Singleton subscription manager, or limit tabs via BroadcastChannel API

---

## Severity Distribution

| Severity | Count | Immediate Action Required |
|----------|-------|--------------------------|
| Critical | 3 | Yes — direct cost exposure |
| High | 5 | Yes — scalable abuse vectors |
| Medium | 6 | Plan — defense-in-depth gaps |
| Low | 3 | Track — operational hygiene |
| Info | 1 | Awareness — future planning |

## Categories Covered

All 7/7 adversarial audit categories were assessed.

## Recommendations Priority

### Immediate Fixes (Critical + High)

1. **Cap reminder creation** — max 20 active reminders per couple (DB trigger)
2. **Cap cron email batch** — max 100 emails per cron invocation
3. **Add server-side photo size limit** — configure Supabase bucket `file_size_limit`
4. **Add per-couple email throttle** — max 10 notification emails per hour
5. **Replace in-memory rate limiter** — use Upstash Redis or Supabase-backed counter
6. **Add LIMIT to streak query** — cap at 365 rows
7. **Rate limit invite resend** — 1 per 5 minutes
8. **Paginate cron reminder query** — process in batches of 100

### Defense-in-Depth (Medium)

9. Add UPDATE RLS policy to `session_settings`
10. Add DELETE RLS policies where missing (or document as intentional)
11. Add privacy field selection + client-side filter in activity feed
12. Add per-couple row limits on data tables (notes, requests, etc.)
13. Implement couple orphan cleanup job
14. Add creation limits to match deletion limits

### Operational Hygiene (Low + Info)

15. Set up Resend spending alerts
16. Monitor Supabase storage growth
17. Plan billing/quota architecture for future monetization
18. Add audit logging for couple data mutations

---

*Generated by adversarial audit skill on 2026-03-14*
