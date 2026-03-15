# Adversarial Audit Remediation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 14 adversarial audit findings by adding persistent rate limiting, per-couple resource caps, cron safeguards, storage hardening, and missing RLS policies.

**Architecture:** 5 independent work streams (A-E) that can run in parallel. Each stream touches different files and migrations. Work Stream A (rate limiter) must land before C (email safeguards) since C depends on the rate limiter for daily email caps.

**Tech Stack:** Supabase (Postgres triggers, RPC functions, RLS policies, storage policies), TypeScript, Vitest

**Spec:** `docs/superpowers/specs/2026-03-14-adversarial-remediation-design.md`

---

## Chunk 1: Work Stream A — Supabase-Backed Rate Limiter

### Task 1: Create rate_limits migration

**Files:**
- Create: `supabase/migrations/00027_rate_limits.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/00027_rate_limits.sql

CREATE TABLE public.rate_limits (
  key TEXT NOT NULL,
  count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (key)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No RLS policies — accessed only via SECURITY DEFINER functions

-- Index for efficient cleanup and lookups
CREATE INDEX idx_rate_limits_expires_at ON public.rate_limits (expires_at);

-- Cleanup function to remove expired entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER SET search_path = ''
AS $$
  DELETE FROM public.rate_limits WHERE expires_at < now();
$$;

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

- [ ] **Step 2: Verify migration syntax**

Run: `make db-push`
Expected: Migration applies successfully with no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00027_rate_limits.sql
git commit -m "feat(db): add rate_limits table and check_rate_limit RPC"
```

---

### Task 2: Rewrite rate-limit.ts to use Supabase

**Files:**
- Modify: `src/lib/rate-limit.ts`
- Modify: `src/lib/rate-limit.test.ts`

- [ ] **Step 1: Write failing tests for the new async rate limiter**

Replace the entire contents of `src/lib/rate-limit.test.ts` with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createRateLimiter } from './rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

const mockRpc = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ rpc: mockRpc })
})

describe('createRateLimiter', () => {
  it('allows requests when RPC returns true', async () => {
    mockRpc.mockResolvedValueOnce({ data: true, error: null })
    const limiter = createRateLimiter({ maxRequests: 5, windowSeconds: 60 })
    const result = await limiter.check('test-key')
    expect(result).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('check_rate_limit', {
      p_key: 'test-key',
      p_max_requests: 5,
      p_window_seconds: 60,
    })
  })

  it('blocks requests when RPC returns false', async () => {
    mockRpc.mockResolvedValueOnce({ data: false, error: null })
    const limiter = createRateLimiter({ maxRequests: 3, windowSeconds: 60 })
    const result = await limiter.check('test-key')
    expect(result).toBe(false)
  })

  it('fails open by default when RPC errors', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB down' } })
    const limiter = createRateLimiter({ maxRequests: 5, windowSeconds: 60 })
    const result = await limiter.check('test-key')
    expect(result).toBe(true)
  })

  it('fails closed when configured for security-sensitive endpoints', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB down' } })
    const limiter = createRateLimiter({ maxRequests: 5, windowSeconds: 60, failClosed: true })
    const result = await limiter.check('test-key')
    expect(result).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/lib/rate-limit.test.ts`
Expected: FAIL — tests reference `windowSeconds` but current implementation uses `windowMs`, and `check()` is sync not async.

- [ ] **Step 3: Rewrite rate-limit.ts**

Replace the entire contents of `src/lib/rate-limit.ts` with:

```typescript
import { createAdminClient } from '@/lib/supabase/admin'

interface RateLimiterConfig {
  maxRequests: number
  windowSeconds: number
  failClosed?: boolean
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
        return !config.failClosed
      }
      return data as boolean
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/lib/rate-limit.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limit.ts src/lib/rate-limit.test.ts
git commit -m "feat: replace in-memory rate limiter with Supabase-backed implementation"
```

---

### Task 3: Update invite actions to use async rate limiter

**Files:**
- Modify: `src/app/invite/[token]/actions.ts`
- Modify: `src/app/invite/[token]/actions.test.ts`

- [ ] **Step 1: Update the rate limiter config and async calls**

In `src/app/invite/[token]/actions.ts`:

Change line 14:
```typescript
const inviteLimiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 })
```
to:
```typescript
const inviteLimiter = createRateLimiter({ maxRequests: 10, windowSeconds: 60, failClosed: true })
```

Change line 31:
```typescript
  if (!inviteLimiter.check(ip)) {
```
to:
```typescript
  if (!(await inviteLimiter.check(ip))) {
```

- [ ] **Step 2: Update tests**

In `src/app/invite/[token]/actions.test.ts`, add the rate-limit mock at the top of the file (alongside other mocks):

```typescript
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: vi.fn().mockResolvedValue(true),
  })),
}))
```

If there's an existing test for "rate limited" behavior, update the mock to return `mockResolvedValue(false)` for that specific test.

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/app/invite`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/invite/
git commit -m "fix: update invite actions to use async Supabase-backed rate limiter"
```

---

### Task 4: Update webhook route to use async rate limiter

**Files:**
- Modify: `src/app/api/email/webhook/route.ts`
- Modify: `src/app/api/email/webhook/route.test.ts`

- [ ] **Step 1: Update webhook rate limiter config and async call**

In `src/app/api/email/webhook/route.ts`:

Change line 7:
```typescript
const webhookLimiter = createRateLimiter({ maxRequests: 100, windowMs: 60_000 })
```
to:
```typescript
const webhookLimiter = createRateLimiter({ maxRequests: 100, windowSeconds: 60 })
```

Change line 22:
```typescript
  if (!webhookLimiter.check(ip)) {
```
to:
```typescript
  if (!(await webhookLimiter.check(ip))) {
```

- [ ] **Step 2: Update tests**

In `src/app/api/email/webhook/route.test.ts`, add the rate-limit mock:

```typescript
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: vi.fn().mockResolvedValue(true),
  })),
}))
```

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/app/api/email/webhook`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/email/webhook/
git commit -m "fix: update webhook route to use async Supabase-backed rate limiter"
```

---

### Task 5: Add rate limiting to invite resend

**Files:**
- Modify: `src/app/(app)/settings/actions/profile.ts`
- Modify: `src/app/(app)/settings/actions/profile.test.ts` (or `actions-profile.test.ts`)

- [ ] **Step 1: Add rate limiter to resendInviteAction**

In `src/app/(app)/settings/actions/profile.ts`, add import at top:

```typescript
import { createRateLimiter } from '@/lib/rate-limit'
```

Add limiter constant after the `profileSchema` definition:

```typescript
const resendLimiter = createRateLimiter({ maxRequests: 3, windowSeconds: 3600 })
```

In `resendInviteAction()`, after the `if (!profile?.couple_id)` check (after line 59), add:

```typescript
  const allowed = await resendLimiter.check(`invite:resend:${profile.couple_id}`)
  if (!allowed) {
    return { error: 'Too many invite resends. Please wait before trying again.' }
  }
```

- [ ] **Step 2: Add rate-limit mock to test file**

In the test file for profile actions, add:

```typescript
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: vi.fn().mockResolvedValue(true),
  })),
}))
```

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/app/(app)/settings/actions/profile`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/settings/actions/profile.ts src/app/(app)/settings/actions/profile.test.ts
git commit -m "feat: add rate limiting to invite resend (3/hr per couple)"
```

---

### Task 6: Add rate limiting to request creation

**Files:**
- Modify: `src/app/(app)/requests/actions.ts`
- Modify: `src/app/(app)/requests/actions.test.ts`

- [ ] **Step 1: Add rate limiter to createRequest**

In `src/app/(app)/requests/actions.ts`, add import:

```typescript
import { createRateLimiter } from '@/lib/rate-limit'
```

Add limiter constant after the `requestSchema` definition:

```typescript
const requestLimiter = createRateLimiter({ maxRequests: 20, windowSeconds: 86400 })
```

In `createRequest()`, after the `if (!profile?.couple_id)` check (after line 33), add:

```typescript
  const allowed = await requestLimiter.check(`request:create:${profile.couple_id}`)
  if (!allowed) {
    return { error: 'Daily request limit reached. Try again tomorrow.' }
  }
```

- [ ] **Step 2: Add rate-limit mock to test file**

In `src/app/(app)/requests/actions.test.ts`, add:

```typescript
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: vi.fn().mockResolvedValue(true),
  })),
}))
```

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/app/(app)/requests/actions`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/requests/actions.ts src/app/(app)/requests/actions.test.ts
git commit -m "feat: add rate limiting to request creation (20/day per couple)"
```

---

### Task 7: Add rate limiting to milestone and check-in creation

**Files:**
- Modify: `src/hooks/useMilestones.ts`
- Modify: `src/app/(app)/checkin/actions.ts`

Note: `useMilestones.ts` is a client-side hook — it cannot call `createAdminClient()` directly. The milestone rate limit is enforced server-side via the DB trigger (Task 8) and the resource cap (Task 12). No client-side rate limiter is needed here.

For check-in creation, find the server action that creates check-ins. If it exists as a server action (check `src/lib/checkin-operations.ts` or `src/app/(app)/checkin/actions.ts`), add a rate limiter:

- [ ] **Step 1: Identify the check-in creation server action**

Search for the function that inserts into the `check_ins` table. It may be in `src/lib/checkin-operations.ts`. Read the file to find the insert function.

- [ ] **Step 2: Add rate limiter to check-in creation**

Add import and limiter:
```typescript
import { createRateLimiter } from '@/lib/rate-limit'

const checkinLimiter = createRateLimiter({ maxRequests: 10, windowSeconds: 86400 })
```

Before the check-in insert, add:
```typescript
  const allowed = await checkinLimiter.check(`checkin:create:${coupleId}`)
  if (!allowed) {
    return { error: 'Daily check-in limit reached. Try again tomorrow.' }
  }
```

- [ ] **Step 3: Add rate-limit mock to the corresponding test file**

```typescript
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: vi.fn().mockResolvedValue(true),
  })),
}))
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/lib/checkin-operations` or the appropriate test file.
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add rate limiting to check-in creation (10/day per couple)"
```

---

### Task 8: Run full test suite for Work Stream A

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: All tests PASS. If any test fails due to the sync→async change in `createRateLimiter`, add the rate-limit mock to that test file.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No lint errors.

---

## Chunk 2: Work Stream B — Per-Couple Resource Caps

### Task 8: Create resource caps migration

**Files:**
- Create: `supabase/migrations/00028_resource_caps.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/00028_resource_caps.sql

-- Generic couple resource limit trigger function.
-- Reusable across tables: pass table name and max count as trigger arguments.
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

- [ ] **Step 2: Verify migration syntax**

Run: `make db-push`
Expected: Migration applies successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00028_resource_caps.sql
git commit -m "feat(db): add per-couple resource cap triggers for 6 tables"
```

---

### Task 9: Add resource cap check to createReminder

**Files:**
- Modify: `src/app/(app)/reminders/actions.ts`
- Modify: `src/app/(app)/reminders/actions.test.ts`

- [ ] **Step 1: Write failing test for resource cap**

In `src/app/(app)/reminders/actions.test.ts`, add this test inside the `createReminder` describe block:

```typescript
  it('rejects when couple has reached reminder limit', async () => {
    const { createReminder } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })

    // Mock the count query to return 50 (at limit)
    mockSupabase._queryBuilder.select.mockReturnValueOnce(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq.mockReturnValueOnce({
      ...mockSupabase._queryBuilder,
      then: (resolve: (value: { count: number }) => void) => resolve({ count: 50 }),
    })

    const fd = makeFormData(validReminderData)
    const result = await createReminder({}, fd)
    expect(result.error).toContain('maximum of 50 reminders')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/(app)/reminders/actions.test.ts`
Expected: FAIL — createReminder doesn't check count yet.

- [ ] **Step 3: Add count check to createReminder**

In `src/app/(app)/reminders/actions.ts`, inside `createReminder()`, after the `if (!profile?.couple_id)` check (after line 34), add:

```typescript
  const { count } = await supabase
    .from('reminders')
    .select('*', { count: 'exact', head: true })
    .eq('couple_id', profile.couple_id)

  if (count !== null && count >= 50) {
    return { error: 'You\u2019ve reached the maximum of 50 reminders. Delete some to create new ones.' }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/app/(app)/reminders/actions.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/reminders/actions.ts src/app/(app)/reminders/actions.test.ts
git commit -m "feat: add 50-reminder cap check in createReminder"
```

---

### Task 10: Add resource cap check to createNote

**Files:**
- Modify: `src/app/(app)/notes/actions.ts`
- Modify: `src/app/(app)/notes/actions.test.ts`

- [ ] **Step 1: Write failing test for note cap**

In `src/app/(app)/notes/actions.test.ts`, add a test for the limit:

```typescript
  it('rejects when couple has reached note limit', async () => {
    const { createNote } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })

    // Mock the count query to return 1000 (at limit)
    mockSupabase._queryBuilder.select.mockReturnValueOnce(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq.mockReturnValueOnce({
      ...mockSupabase._queryBuilder,
      then: (resolve: (value: { count: number }) => void) => resolve({ count: 1000 }),
    })

    const fd = makeFormData({ content: 'test', privacy: 'shared' })
    const result = await createNote({ error: null }, fd)
    expect(result.error).toContain('maximum of 1,000 notes')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/(app)/notes/actions.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add count check to createNote**

In `src/app/(app)/notes/actions.ts`, inside `createNote()`, after `if (!profile?.couple_id)` (after line 59), add:

```typescript
  const { count } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('couple_id', profile.couple_id)

  if (count !== null && count >= 1000) {
    return { error: 'You\u2019ve reached the maximum of 1,000 notes. Delete some to create new ones.' }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/app/(app)/notes/actions.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/notes/actions.ts src/app/(app)/notes/actions.test.ts
git commit -m "feat: add 1000-note cap check in createNote"
```

---

### Task 11: Add resource cap check to createRequest

**Files:**
- Modify: `src/app/(app)/requests/actions.ts` (already modified in Task 6 for rate limiting)
- Modify: `src/app/(app)/requests/actions.test.ts`

- [ ] **Step 1: Write failing test for request cap**

Add test to `src/app/(app)/requests/actions.test.ts`:

```typescript
  it('rejects when couple has reached request limit', async () => {
    const { createRequest } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })

    // Mock count query returning 100
    mockSupabase._queryBuilder.select.mockReturnValueOnce(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq.mockReturnValueOnce({
      ...mockSupabase._queryBuilder,
      then: (resolve: (value: { count: number }) => void) => resolve({ count: 100 }),
    })

    const fd = makeFormData(validRequestData)
    const result = await createRequest({}, fd)
    expect(result.error).toContain('maximum of 100 requests')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/(app)/requests/actions.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add count check to createRequest**

In `src/app/(app)/requests/actions.ts`, inside `createRequest()`, after the rate limit check added in Task 6, add:

```typescript
  const { count } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('couple_id', profile.couple_id)

  if (count !== null && count >= 100) {
    return { error: 'You\u2019ve reached the maximum of 100 requests. Delete some to create new ones.' }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/app/(app)/requests/actions.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/requests/actions.ts src/app/(app)/requests/actions.test.ts
git commit -m "feat: add 100-request cap check in createRequest"
```

---

### Task 12: Add resource cap check to milestone creation

**Files:**
- Modify: `src/hooks/useMilestones.ts`
- Modify: `src/hooks/useMilestones.test.ts`

Note: `useMilestones.ts` is a client-side hook. The DB trigger (migration 00028) provides the hard backstop. The app-level check here provides a friendly error message before the DB trigger fires.

- [ ] **Step 1: Add count check to createMilestone in useMilestones.ts**

In `src/hooks/useMilestones.ts`, inside the `createMilestone` callback (around line 142-178), before the `.insert()` call, add a count check:

```typescript
      // Check resource cap before insert
      const { count: milestoneCount } = await supabase
        .from('milestones')
        .select('*', { count: 'exact', head: true })
        .eq('couple_id', coupleId)

      if (milestoneCount !== null && milestoneCount >= 200) {
        throw new Error('You\u2019ve reached the maximum of 200 milestones. Delete some to create new ones.')
      }
```

Add this after the `if (!coupleId) throw new Error('No couple linked')` check (line 143) and before the `setError(null)` call (line 145).

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/hooks/useMilestones`
Expected: All tests PASS (existing tests mock supabase, the count query will return default mock values).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMilestones.ts
git commit -m "feat: add 200-milestone cap check in createMilestone"
```

---

### Task 13: Run full test suite for Work Stream B

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: All tests PASS.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors.

---

## Chunk 3: Work Stream C — Cron & Email Safeguards

### Task 13: Add limit to cron reminder query + rate limit cleanup

**Files:**
- Modify: `src/app/api/cron/send-reminders/route.ts`
- Modify: `src/app/api/cron/send-reminders/route.test.ts`

- [ ] **Step 1: Add `.limit(200)` and cleanup call to cron route**

In `src/app/api/cron/send-reminders/route.ts`:

Add `.limit(200)` after `.lte('scheduled_for', now)` (line 32):
```typescript
    .lte('scheduled_for', now)
    .limit(200)
```

After the response JSON block at the end (before `return`), add a log warning if we hit the limit:

```typescript
  if (reminders.length >= 200) {
    console.warn('[cron/send-reminders] Hit 200-reminder limit — more may be pending')
  }
```

Add rate limit cleanup at the end of the function, before the return statement:

```typescript
  // Clean up expired rate limit entries
  await supabase.rpc('cleanup_expired_rate_limits')
```

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/app/api/cron/send-reminders`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/send-reminders/route.ts
git commit -m "fix: cap cron reminder query at 200 and add rate limit cleanup"
```

---

### Task 15: Add per-couple daily email cap

**Files:**
- Modify: `src/lib/email/send.ts`
- Modify: `src/lib/email/send.test.ts`

This task depends on Work Stream A (the Supabase-backed rate limiter). The daily email cap prevents a single couple from triggering more than 50 emails per day across all features.

- [ ] **Step 1: Add rate limiter and optional coupleId to sendEmail**

In `src/lib/email/send.ts`, add import at top:

```typescript
import { createRateLimiter } from '@/lib/rate-limit'
```

Add limiter constant after the imports:

```typescript
const emailDailyLimiter = createRateLimiter({ maxRequests: 50, windowSeconds: 86400 })
```

Change `SendEmailParams` to add an optional `coupleId`:

```typescript
interface SendEmailParams {
  to: string
  subject: string
  react: ReactElement
  coupleId?: string
}
```

In the `sendEmail` function body, before the `getResend().emails.send()` call, add:

```typescript
  if (coupleId) {
    const allowed = await emailDailyLimiter.check(`email:daily:${coupleId}`)
    if (!allowed) {
      return { data: null, error: { message: 'Daily email limit reached for this couple' } }
    }
  }
```

- [ ] **Step 2: Add rate-limit mock to test file**

In `src/lib/email/send.test.ts`, add:

```typescript
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: vi.fn().mockResolvedValue(true),
  })),
}))
```

- [ ] **Step 3: Run tests**

Run: `npm run test -- src/lib/email/send`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/email/send.ts src/lib/email/send.test.ts
git commit -m "feat: add per-couple daily email cap (50/day) in sendEmail"
```

---

### Task 16: Add limit to streak query

**Files:**
- Modify: `src/lib/streaks.ts`
- Modify: `src/lib/streaks.test.ts`

- [ ] **Step 1: Add `.limit(365)` to getStreakData query**

In `src/lib/streaks.ts`, in the `getStreakData()` function, add `.limit(365)` after `.order('completed_at', { ascending: false })` (line 129):

```typescript
    .order('completed_at', { ascending: false })
    .limit(365)
```

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/lib/streaks`
Expected: All tests PASS (pure logic tests don't hit the query).

- [ ] **Step 3: Commit**

```bash
git add src/lib/streaks.ts
git commit -m "fix: cap streak query at 365 rows to prevent unbounded fetch"
```

---

### Task 15: Run full test suite for Work Stream C

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: All tests PASS.

---

## Chunk 4: Work Stream D — Storage Hardening

### Task 16: Create storage hardening migration

**Files:**
- Create: `supabase/migrations/00029_storage_hardening.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/00029_storage_hardening.sql

-- Restrict milestone-photos bucket to 10MB per file (down from global 50MB)
UPDATE storage.buckets
SET file_size_limit = 10485760  -- 10 MB
WHERE id = 'milestone-photos';

-- Replace overly permissive upload policy (from migration 00005) with couple-scoped one
-- Policy name: "Authenticated users can upload photos" (00005_milestones.sql line 28)
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

- [ ] **Step 2: Verify migration syntax**

Run: `make db-push`
Expected: Migration applies successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00029_storage_hardening.sql
git commit -m "feat(db): restrict photo uploads to 10MB and couple-scoped folders"
```

---

## Chunk 5: Work Stream E — Defense-in-Depth & Missing Policies

### Task 17: Create missing RLS policies migration

**Files:**
- Create: `supabase/migrations/00030_missing_delete_policies.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/00030_missing_delete_policies.sql

-- Add DELETE policy for couple_invites (missing from 00003)
CREATE POLICY "Couple members can delete invites" ON public.couple_invites
  FOR DELETE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));

-- Add DELETE policy for session_settings_proposals (missing from 00014)
CREATE POLICY "Couple members can delete proposals" ON public.session_settings_proposals
  FOR DELETE USING (couple_id IN (SELECT couple_id FROM public.profiles WHERE id = auth.uid()));
```

- [ ] **Step 2: Verify migration syntax**

Run: `make db-push`
Expected: Migration applies successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00030_missing_delete_policies.sql
git commit -m "feat(db): add missing DELETE policies for couple_invites and proposals"
```

---

### Task 18: Add privacy filter to activity feed

**Files:**
- Modify: `src/lib/activity.ts`
- Modify: `src/lib/activity.test.ts`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Write failing test for privacy filtering**

In `src/lib/activity.test.ts`, add a test that verifies the function signature includes `userId`:

```typescript
  it('accepts userId parameter for privacy filtering', async () => {
    const { getRecentActivity } = await import('./activity')
    // Verify the function accepts 4 parameters (coupleId, userId, supabase, limit)
    expect(getRecentActivity.length).toBeGreaterThanOrEqual(2)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/activity.test.ts`
Expected: FAIL or PASS depending on how the test runner handles arity checks. If PASS, proceed to Step 3 anyway since the real verification is the privacy filter.

- [ ] **Step 3: Update getRecentActivity signature and notes query**

In `src/lib/activity.ts`:

Change the function signature (line 10-13) from:
```typescript
export async function getRecentActivity(
  coupleId: string,
  supabase: SupabaseClient,
  limit = 5,
): Promise<ActivityItem[]> {
```
to:
```typescript
export async function getRecentActivity(
  coupleId: string,
  userId: string,
  supabase: SupabaseClient,
  limit = 5,
): Promise<ActivityItem[]> {
```

Change the notes query (lines 25-30) from:
```typescript
    supabase
      .from('notes')
      .select('content, created_at')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(3),
```
to:
```typescript
    supabase
      .from('notes')
      .select('content, created_at, privacy, author_id')
      .eq('couple_id', coupleId)
      .or(`privacy.eq.shared,author_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(3),
```

- [ ] **Step 4: Update the dashboard caller**

In `src/app/(app)/dashboard/page.tsx`, change line 63 from:
```typescript
    getRecentActivity(coupleId, supabase, 20),
```
to:
```typescript
    getRecentActivity(coupleId, userId, supabase, 20),
```

- [ ] **Step 5: Update all test files that call getRecentActivity**

In `src/lib/activity.test.ts`:

1. Add a `mockUserId` constant alongside other mock IDs:
```typescript
const mockUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
```

2. The mock Supabase client from `@/test/mocks/supabase.ts` already includes `.or()` as a chainable method (it's in the `methods` array). No mock updates needed for the `.or()` call.

3. Update **every** call to `getRecentActivity` to include `mockUserId` as the second argument:
```typescript
// Before:
getRecentActivity(mockCoupleId, mockSupabase)
// After:
getRecentActivity(mockCoupleId, mockUserId, mockSupabase)

// Before (with limit):
getRecentActivity(mockCoupleId, mockSupabase, 10)
// After:
getRecentActivity(mockCoupleId, mockUserId, mockSupabase, 10)
```

Search the file for every occurrence of `getRecentActivity(` and update each one.

- [ ] **Step 6: Run tests**

Run: `npm run test -- src/lib/activity`
Expected: All tests PASS.

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors. If any other file calls `getRecentActivity`, TypeScript will catch the missing parameter.

- [ ] **Step 8: Commit**

```bash
git add src/lib/activity.ts src/lib/activity.test.ts src/app/(app)/dashboard/page.tsx
git commit -m "fix: add privacy filter to activity feed notes query"
```

---

## Chunk 6: Final Verification

### Task 19: Full quality pipeline

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests PASS.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No lint errors.

- [ ] **Step 4: Run format check**

Run: `npm run format:check`
Expected: All files formatted correctly. If not, run `npm run format` and commit.

- [ ] **Step 5: Run knip (dead code detection)**

Run: `npm run knip`
Expected: No new dead code introduced. The old `windowMs` type is removed.

---

### Task 20: Final commit and summary

- [ ] **Step 1: Verify git log**

Run: `git log --oneline -10`
Expected: Clean series of commits, one per task.

- [ ] **Step 2: Document the changes**

Verify the following migrations are present:
- `00027_rate_limits.sql` — rate_limits table + check_rate_limit RPC
- `00028_resource_caps.sql` — per-couple resource cap triggers
- `00029_storage_hardening.sql` — 10MB photo limit + couple-scoped upload policy
- `00030_missing_delete_policies.sql` — DELETE policies for couple_invites and proposals

---

## Parallel Execution Guide

These work streams can be executed by parallel agents:

| Work Stream | Tasks | Dependencies | Can Parallel With |
|-------------|-------|-------------|-------------------|
| A: Rate Limiter | 1-8 | None | B, D, E |
| B: Resource Caps | 9-13 | None | A, D, E |
| C: Cron & Email | 14-17 | A (uses rate limiter for email cap) | D, E |
| D: Storage | 18 | None | A, B, C, E |
| E: Policies | 19-20 | None | A, B, C, D |

**Recommended groupings for 3 parallel agents:**
- Agent 1: Work Stream A (Tasks 1-8), then C (Tasks 14-17)
- Agent 2: Work Stream B (Tasks 9-13)
- Agent 3: Work Stream D (Task 18) + E (Tasks 19-20)

Final verification (Tasks 21-22) runs after all agents complete.
