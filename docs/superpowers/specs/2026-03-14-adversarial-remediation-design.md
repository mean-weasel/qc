# Adversarial Audit Remediation — Design Spec

**Date:** 2026-03-14
**Status:** Draft
**Context:** Remediating findings from the adversarial audit report (`reports/adversarial-audit.md`)

## Problem

The adversarial audit identified 14 actionable findings (3 Critical, 5 High, 6 Medium) across the QC app. The most severe issues are:

1. **No usage caps** on any data table — unlimited creation of reminders, notes, milestones, etc.
2. **In-memory rate limiter** resets on serverless cold starts — effectively no rate limiting
3. **Unbounded cron email sends** — unlimited reminders feed into daily cron, causing runaway email costs
4. **Missing RLS DELETE policies** on 2 tables

Two findings from the original audit were false positives:
- `session_settings` UPDATE policy exists (migration 00008 line 22)
- Server-side file size limit exists (50MiB in `supabase/config.toml`)

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rate limiting backend | Supabase-backed | No new infrastructure, stays within existing stack |
| Resource cap enforcement | DB triggers + app checks | Hard DB limits for safety, app checks for friendly UX |
| Storage size limit | Lower bucket limit via migration | Server-side enforcement, client validation stays as UX |

## Architecture

### Work Stream A: Supabase-Backed Rate Limiter

**Goal:** Replace the broken in-memory rate limiter with a persistent Supabase-backed one.

**New migration (00027):**

```sql
CREATE TABLE public.rate_limits (
  key TEXT NOT NULL,
  count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (key)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed — accessed only via admin client or SECURITY DEFINER functions

-- Cleanup function to remove expired entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER SET search_path = ''
AS $$
  DELETE FROM public.rate_limits WHERE expires_at < now();
$$;

-- Index for efficient cleanup and lookups
CREATE INDEX idx_rate_limits_expires_at ON public.rate_limits (expires_at);

-- Rate limit check function (single atomic upsert — no race conditions)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_requests INT,
  p_window_seconds INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_allowed BOOLEAN;
BEGIN
  INSERT INTO public.rate_limits (key, count, window_start, expires_at)
  VALUES (p_key, 1, now(), now() + (p_window_seconds || ' seconds')::interval)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN public.rate_limits.expires_at <= now() THEN 1
      ELSE public.rate_limits.count + 1
    END,
    window_start = CASE
      WHEN public.rate_limits.expires_at <= now() THEN now()
      ELSE public.rate_limits.window_start
    END,
    expires_at = CASE
      WHEN public.rate_limits.expires_at <= now() THEN now() + (p_window_seconds || ' seconds')::interval
      ELSE public.rate_limits.expires_at
    END
  RETURNING count <= p_max_requests INTO v_allowed;

  RETURN v_allowed;
END;
$$;
```

**Updated `src/lib/rate-limit.ts`:**

```typescript
import { createAdminClient } from '@/lib/supabase/admin'

interface RateLimiterConfig {
  maxRequests: number
  windowSeconds: number
  failClosed?: boolean // Default false. Set true for security-sensitive endpoints (e.g., invite validation).
}

export function createRateLimiter(config: RateLimiterConfig) {
  return {
    async check(key: string): Promise<boolean> {
      const supabase = createAdminClient()
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_key: key,
        p_max_requests: config.maxRequests,
        p_window_seconds: config.windowSeconds,
      })
      if (error) {
        console.error('Rate limit check failed:', error)
        return !config.failClosed // Default: fail open. Security-sensitive endpoints set failClosed: true.
      }
      return data as boolean
    },
  }
}
```

**Rate limit configurations:**

| Action | Key Pattern | Max Requests | Window |
|--------|------------|-------------|--------|
| Invite validation | `invite:validate:{ip}` | 10 | 60s |
| Invite resend | `invite:resend:{coupleId}` | 3 | 3600s (1hr) |
| Email webhook | `webhook:{ip}` | 100 | 60s |
| Request creation | `request:create:{coupleId}` | 20 | 86400s (1day) |
| Milestone creation | `milestone:create:{coupleId}` | 10 | 86400s (1day) |
| Check-in creation | `checkin:create:{coupleId}` | 10 | 86400s (1day) |

**Callers to update (all existing sync `check()` calls must become `await check()`):**
- `src/app/invite/[token]/actions.ts` — `validateInvite()`: change `if (!inviteLimiter.check(ip))` to `if (!(await inviteLimiter.check(ip)))`. Config: `failClosed: true`.
- `src/app/(app)/settings/actions/profile.ts` — add new rate limit to `resendInviteAction()` (3/hr per couple)
- `src/app/api/email/webhook/route.ts` — change `if (!webhookLimiter.check(ip))` to `if (!(await webhookLimiter.check(ip)))`
- `src/app/(app)/requests/actions.ts` — add new rate limit to `createRequest()` (20/day per couple)

**Cleanup:** Add `cleanup_expired_rate_limits()` call to the existing reminder cron job (piggyback on existing scheduled execution). Expired rows may accumulate between cron runs, but at expected volume (hundreds of entries) this is negligible. The `check_rate_limit` function handles expired rows inline by resetting them, so stale rows don't affect correctness.

### Work Stream B: Per-Couple Resource Caps

**Goal:** Prevent unbounded data creation with hard DB limits + friendly app-level messages.

**New migration (00028):**

```sql
-- Generic couple resource limit trigger
CREATE OR REPLACE FUNCTION public.enforce_couple_resource_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_count INT;
  v_max INT;
  v_table_name TEXT;
BEGIN
  v_table_name := TG_ARGV[0];
  v_max := TG_ARGV[1]::INT;

  EXECUTE format(
    'SELECT count(*) FROM public.%I WHERE couple_id = $1',
    v_table_name
  ) INTO v_count USING NEW.couple_id;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Resource limit reached: maximum % % per couple', v_max, v_table_name
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Apply limits
CREATE TRIGGER enforce_reminder_limit BEFORE INSERT ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_couple_resource_limit('reminders', '50');

CREATE TRIGGER enforce_note_limit BEFORE INSERT ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_couple_resource_limit('notes', '1000');

CREATE TRIGGER enforce_milestone_limit BEFORE INSERT ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.enforce_couple_resource_limit('milestones', '200');

CREATE TRIGGER enforce_request_limit BEFORE INSERT ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_couple_resource_limit('requests', '100');

CREATE TRIGGER enforce_action_item_limit BEFORE INSERT ON public.action_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_couple_resource_limit('action_items', '500');

CREATE TRIGGER enforce_love_action_limit BEFORE INSERT ON public.love_actions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_couple_resource_limit('love_actions', '500');
```

**App-level checks** (added to each server action before INSERT):

```typescript
// Example: in createReminder()
const { count } = await supabase
  .from('reminders')
  .select('*', { count: 'exact', head: true })
  .eq('couple_id', profile.couple_id)

if (count !== null && count >= 50) {
  return { error: 'You\u2019ve reached the maximum of 50 reminders. Delete some to create new ones.' }
}
```

**Resource limits:**

| Table | Max per Couple | Rationale |
|-------|---------------|-----------|
| `reminders` | 50 | Directly feeds email cron — most critical cap |
| `notes` | 1,000 | Generous for daily notes over 3 years |
| `milestones` | 200 | ~4/week for a year |
| `requests` | 100 | Active requests, can delete completed ones |
| `action_items` | 500 | Accumulated from check-ins |
| `love_actions` | 500 | Love language actions per couple |

**Not capped (intentional):**
- `check_ins` — bounded by daily rate limit (10/day) in Work Stream A. Historical records are valuable and accumulate slowly.
- `love_languages` — naturally limited (~5 per person, unlikely to exceed dozens)

**Files to modify:**
- `src/app/(app)/reminders/actions.ts` — add count check in `createReminder()`
- `src/app/(app)/notes/actions.ts` — add count check in `createNote()`
- `src/app/(app)/requests/actions.ts` — add count check in `createRequest()`
- `src/hooks/useMilestones.ts` — add count check in `createMilestone()` (client-side, backed by trigger)

### Work Stream C: Cron & Email Safeguards

**Goal:** Bound the cron job's email output and fix unbounded queries.

**Changes to `src/app/api/cron/send-reminders/route.ts`:**
1. Add `.limit(200)` to reminder query (line 27-32)
2. Log warning if results hit the limit (indicates more pending)
3. Call `cleanup_expired_rate_limits()` at end of cron run

**Changes to `src/lib/streaks.ts`:**
1. Add `.limit(365)` to the query in `getStreakData()` function
2. Streak calculation only needs ~52 weeks of data, 365 rows is more than sufficient

**Changes to `src/lib/email/send.ts`:**
1. Add per-couple daily email cap check using the rate limiter:
   - Key: `email:daily:{coupleId}`, max: 50, window: 86400s
   - Check before sending in `sendEmail()` — skip if cap exceeded

### Work Stream D: Storage Hardening

**Goal:** Tighten milestone photo upload restrictions.

**New migration (00029):**

```sql
-- Restrict milestone-photos bucket to 10MB per file
UPDATE storage.buckets
SET file_size_limit = 10485760  -- 10 MB
WHERE id = 'milestone-photos';

-- Replace overly permissive upload policy (from migration 00005) with couple-scoped one
-- Exact policy name: "Authenticated users can upload photos" (defined in 00005_milestones.sql line 28)
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;

CREATE POLICY "Couple members can upload milestone photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'milestone-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT couple_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );
```

This ensures:
1. Server-side 10MB limit (can't be bypassed like client-side)
2. Users can only upload to their own couple's folder

### Work Stream E: Defense-in-Depth & Missing Policies

**Goal:** Fix remaining RLS gaps and add privacy defense layers.

**New migration (00030):**

```sql
-- Add DELETE policy for couple_invites
CREATE POLICY "Couple members can delete invites" ON public.couple_invites
  FOR DELETE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));

-- Add DELETE policy for session_settings_proposals
CREATE POLICY "Couple members can delete proposals" ON public.session_settings_proposals
  FOR DELETE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
```

**Changes to `src/lib/activity.ts`:**

Add privacy-aware note query. The notes query in `getRecentActivity()` (lines 25-30) currently selects only `content, created_at` without filtering by privacy:

```typescript
// Before:
supabase
  .from('notes')
  .select('content, created_at')
  .eq('couple_id', coupleId)
  .order('created_at', { ascending: false })
  .limit(3),

// After:
supabase
  .from('notes')
  .select('content, created_at, privacy, author_id')
  .eq('couple_id', coupleId)
  .or(`privacy.eq.shared,author_id.eq.${userId}`)
  .order('created_at', { ascending: false })
  .limit(3),
```

**Threading `userId`:** Update the function signature from `getRecentActivity(coupleId, supabase, limit)` to `getRecentActivity(coupleId, userId, supabase, limit)`. Update the caller in `src/app/(app)/dashboard/page.tsx` to pass `user.id` (already available from `requireAuth()` in that file).

## Testing Strategy

- **Unit tests** for the new Supabase-backed rate limiter (mock Supabase RPC)
- **Unit tests** for resource cap error handling in each server action
- **Migration tests** via `make db-push` + manual verification
- **Existing tests** must still pass (no breaking changes)

## Files Changed Summary

| Work Stream | New Files | Modified Files | New Migrations |
|-------------|-----------|---------------|---------------|
| A: Rate Limiter | 0 | `rate-limit.ts`, `invite/actions.ts`, `profile.ts`, `webhook/route.ts`, `requests/actions.ts` | 00027 |
| B: Resource Caps | 0 | `reminders/actions.ts`, `notes/actions.ts`, `requests/actions.ts`, `useMilestones.ts` | 00028 |
| C: Cron & Email | 0 | `send-reminders/route.ts`, `streaks.ts`, `email/send.ts` | 0 |
| D: Storage | 0 | 0 | 00029 |
| E: Policies | 0 | `activity.ts`, `dashboard/page.tsx` (thread userId) | 00030 |
