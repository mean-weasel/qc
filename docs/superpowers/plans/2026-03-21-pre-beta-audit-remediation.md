# Pre-Beta Audit Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all security, rate-limiting, feature, test, and UX gaps identified in the pre-open-beta audit.

**Architecture:** Six phases ordered by risk — critical security fixes first (DB migrations, rate limiting), then missing features (password reset, account deletion), UX polish (dark mode, a11y, confirmations), test coverage, performance (indexes), and cleanup. Each phase produces independently deployable, testable work.

**Tech Stack:** Next.js 16, Supabase (Postgres + Auth + Storage), TypeScript, Tailwind CSS, Vitest, shadcn/ui (Radix), Zod, Resend

---

## Phase 1: Critical Security Fixes

### Task 1: Enable Leaked Password Protection

**Files:**

- None (Supabase Dashboard setting)

> This is a manual step — cannot be done via migration.

- [ ] **Step 1: Enable in Supabase Dashboard**

Navigate to: Supabase Dashboard → Project `qc-production` → Authentication → Settings → Password Protection
Toggle ON: "Leaked Password Protection"
Docs: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

- [ ] **Step 2: Verify**

Attempt signup with a known-breached password (e.g., `password123`). Confirm Supabase rejects it.

---

### Task 2: Secure SECURITY DEFINER RPC Functions

**Files:**

- Create: `supabase/migrations/00032_secure_rpc_functions.sql`

These three RPCs accept arbitrary IDs without verifying the caller owns them. Add `auth.uid()` checks.

> **IMPORTANT:** `auth.uid()` may be NULL in Next.js server actions on Vercel (the original `create_couple_for_user` was designed for this). The guards below use `IS NOT NULL AND !=` to only block when auth context IS present but mismatched — preserving the existing server-action behavior where `auth.uid()` is NULL.

- [ ] **Step 1: Write the migration**

```sql
-- 00032_secure_rpc_functions.sql
-- Secure SECURITY DEFINER functions by verifying caller identity.
-- Note: auth.uid() can be NULL in Next.js server actions on Vercel,
-- so we guard only when auth context IS present but mismatched.

-- 1. create_couple_for_user: when auth context exists, verify caller IS the user
CREATE OR REPLACE FUNCTION public.create_couple_for_user(p_user_id uuid, p_couple_name text DEFAULT NULL)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $function$
DECLARE
  v_couple_id UUID;
BEGIN
  -- If auth context is present, verify the caller is the target user
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot create couple for another user';
  END IF;

  INSERT INTO public.couples (name)
  VALUES (p_couple_name)
  RETURNING id INTO v_couple_id;

  UPDATE public.profiles
  SET couple_id = v_couple_id
  WHERE id = p_user_id;

  RETURN v_couple_id;
END;
$function$;

-- 2. update_couple_setting: when auth context exists, verify caller belongs to couple
CREATE OR REPLACE FUNCTION public.update_couple_setting(p_couple_id uuid, p_key text, p_value boolean)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $function$
BEGIN
  -- If auth context is present, verify the caller belongs to this couple
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND couple_id = p_couple_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: you do not belong to this couple';
  END IF;

  UPDATE public.couples
  SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(p_key, p_value)
  WHERE id = p_couple_id;
END;
$function$;

-- 3. convert_request_to_reminder: when auth context exists, verify caller belongs to couple
CREATE OR REPLACE FUNCTION public.convert_request_to_reminder(p_request_id uuid, p_couple_id uuid, p_user_id uuid)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $function$
DECLARE
  v_request RECORD;
  v_reminder_id UUID;
BEGIN
  -- If auth context is present, verify the caller belongs to this couple
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND couple_id = p_couple_id
  ) THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;

  -- Fetch and lock the request
  SELECT * INTO v_request
  FROM public.requests
  WHERE id = p_request_id AND couple_id = p_couple_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Request not found');
  END IF;

  IF v_request.status != 'accepted' THEN
    RETURN json_build_object('error', 'Only accepted requests can be converted');
  END IF;

  IF v_request.converted_to_reminder_id IS NOT NULL THEN
    RETURN json_build_object('error', 'Request has already been converted');
  END IF;

  -- Create the reminder
  INSERT INTO public.reminders (couple_id, title, message, frequency, is_active, converted_from_request_id)
  VALUES (p_couple_id, v_request.title, v_request.description, 'once', true, p_request_id)
  RETURNING id INTO v_reminder_id;

  -- Update the request
  UPDATE public.requests
  SET status = 'converted', converted_to_reminder_id = v_reminder_id
  WHERE id = p_request_id;

  RETURN json_build_object('reminder_id', v_reminder_id);
END;
$function$;
```

- [ ] **Step 2: Apply locally and test**

Run: `make db-push`
Test via Supabase SQL editor: call `create_couple_for_user` with a different user's ID and confirm it raises "Unauthorized".

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00032_secure_rpc_functions.sql
git commit -m "fix(db): add auth.uid() checks to SECURITY DEFINER RPCs"
```

---

### Task 3: Set milestone-photos Bucket to Private

**Files:**

- Create: `supabase/migrations/00033_private_milestone_photos.sql`
- Modify: `src/hooks/milestone-helpers.ts` — update photo URL generation if needed

- [ ] **Step 1: Write the migration**

```sql
-- 00033_private_milestone_photos.sql
-- Set milestone-photos bucket to private to enforce RLS on read access
-- Public URLs bypass RLS; authenticated URLs respect storage policies

UPDATE storage.buckets
SET public = false
WHERE id = 'milestone-photos';
```

- [ ] **Step 2: Update upload to store relative paths instead of full URLs**

Read `src/hooks/milestone-helpers.ts` and find where `getPublicUrl` is called (around line 70). The current code stores the full public URL in `milestones.photo_url`. Instead, store just the storage path (e.g., `milestone-photos/{user_id}/{filename}`) so the display layer can generate signed URLs at render time.

```typescript
// Before (stores full public URL):
const { data: urlData } = supabase.storage.from('milestone-photos').getPublicUrl(filePath)
// ... stores urlData.publicUrl in DB

// After (stores relative path only):
// Just store the filePath directly in the DB — no getPublicUrl call needed
```

- [ ] **Step 3: Create a helper to generate signed URLs at render time**

Add a function to `src/hooks/milestone-helpers.ts`:

```typescript
export async function getMilestonePhotoUrl(supabase: SupabaseClient, photoPath: string): Promise<string | null> {
  // Handle legacy full URLs (existing data) by extracting the path
  const path = photoPath.includes('/storage/v1/object/public/milestone-photos/')
    ? photoPath.split('/storage/v1/object/public/milestone-photos/')[1]
    : photoPath.startsWith('milestone-photos/')
      ? photoPath.replace('milestone-photos/', '')
      : photoPath

  const { data, error } = await supabase.storage.from('milestone-photos').createSignedUrl(path, 3600) // 1 hour expiry

  if (error) return null
  return data.signedUrl
}
```

- [ ] **Step 4: Update all components that render milestone photos**

Search for components rendering `photo_url` from milestones. Update them to call `getMilestonePhotoUrl()` instead of using the stored URL directly. Key files to check:

- `src/components/growth/` — milestone cards, photo gallery, timeline
- `src/app/(app)/growth/` — page components

- [ ] **Step 5: Update cleanup cron URL parsing**

Modify `src/app/api/cron/cleanup-storage/route.ts` — the cron parses public URL patterns (e.g., `/storage/v1/object/public/milestone-photos/`). Update the `extractStoragePath()` function to handle both legacy full URLs and new relative paths.

- [ ] **Step 6: Apply locally and test**

Run: `make db-push`
Verify: Upload a photo as user A, try to access the old public URL in an incognito window — should get 403.
Verify: Photo still displays correctly in the app via signed URL.
Verify: Existing photos with legacy URLs still render (the helper extracts the path).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/00033_private_milestone_photos.sql \
        src/hooks/milestone-helpers.ts \
        src/app/api/cron/cleanup-storage/route.ts \
        src/components/growth/
git commit -m "fix(storage): set milestone-photos bucket to private, use signed URLs"
```

---

### Task 4: Add Rate Limiting to Login and Signup

**Files:**

- Create: `src/app/(auth)/login/actions.ts`
- Create: `src/app/(auth)/login/actions.test.ts`
- Modify: `src/app/(auth)/login/page.tsx` — call server action instead of direct Supabase Auth
- Create: `src/app/(auth)/signup/signup-actions.ts`
- Create: `src/app/(auth)/signup/signup-actions.test.ts`
- Modify: `src/app/(auth)/signup/SignupForm.tsx` — call server action instead of direct Supabase Auth

Currently, login/signup call `supabase.auth.signInWithPassword()` and `supabase.auth.signUp()` directly from client components with no rate limiting. Move these to server actions with IP-based rate limiting using the existing `createRateLimiter` pattern from `src/lib/rate-limit.ts`.

- [ ] **Step 1: Write the failing test for login action**

Create `src/app/(auth)/login/actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockUser = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'test@example.com' }
let mockSupabase: ReturnType<typeof createMockSupabaseClient>

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({
    check: vi.fn().mockResolvedValue(true),
  }),
}))

beforeEach(async () => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabaseClient()
  const { createClient } = await import('@/lib/supabase/server')
  ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
})

describe('loginWithPassword', () => {
  it('returns error for invalid email', async () => {
    const { loginWithPassword } = await import('./actions')
    const result = await loginWithPassword({ email: 'not-an-email', password: 'password123' })
    expect(result.error).toBeTruthy()
  })

  it('returns error when rate limited', async () => {
    const { createRateLimiter } = await import('@/lib/rate-limit')
    vi.mocked(createRateLimiter).mockReturnValue({ check: vi.fn().mockResolvedValue(false) } as never)
    const { loginWithPassword } = await import('./actions')
    const result = await loginWithPassword({ email: 'test@example.com', password: 'password123' })
    expect(result.error).toContain('Too many')
  })

  it('calls signInWithPassword on valid input', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: mockUser }, error: null })
    const { loginWithPassword } = await import('./actions')
    const result = await loginWithPassword({ email: 'test@example.com', password: 'password123' })
    expect(result.error).toBeNull()
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/(auth)/login/actions.test.ts`
Expected: FAIL — module `./actions` does not exist.

- [ ] **Step 3: Implement login server action**

Create `src/app/(auth)/login/actions.ts`:

```typescript
'use server'

import { headers } from 'next/headers'
import { z } from 'zod'

import { createRateLimiter } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const loginLimiter = createRateLimiter({
  maxRequests: 10,
  windowSeconds: 900, // 10 attempts per 15 minutes
})

export async function loginWithPassword(input: { email: string; password: string }): Promise<{ error: string | null }> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const headersList = await headers()
  const ip = headersList.get('x-real-ip') ?? headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await loginLimiter.check(`login:${ip}`)
  if (!allowed) {
    return { error: 'Too many login attempts. Please try again in a few minutes.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/(auth)/login/actions.test.ts`
Expected: PASS

- [ ] **Step 5: Update login page to use server action**

Modify `src/app/(auth)/login/page.tsx`:

- Import `loginWithPassword` from `./actions`
- Replace the direct `supabase.auth.signInWithPassword()` call in the form handler with `loginWithPassword({ email, password })`
- Keep the `router.push()` call after successful login
- Remove the client-side Supabase auth import if no longer needed

- [ ] **Step 6: Repeat for signup — write test, implement action, update form**

Create `src/app/(auth)/signup/signup-actions.ts` with `signupWithPassword` server action (same pattern: Zod validation, IP rate limiter at 5/hour, calls `supabase.auth.signUp()`).

Create `src/app/(auth)/signup/signup-actions.test.ts` with tests for validation, rate limiting, and successful signup.

Update `src/app/(auth)/signup/SignupForm.tsx` to call the server action.

- [ ] **Step 7: Commit**

```bash
git add src/app/(auth)/login/actions.ts src/app/(auth)/login/actions.test.ts \
        src/app/(auth)/login/page.tsx \
        src/app/(auth)/signup/signup-actions.ts src/app/(auth)/signup/signup-actions.test.ts \
        src/app/(auth)/signup/SignupForm.tsx
git commit -m "feat(auth): add rate limiting to login and signup via server actions"
```

---

### Task 5: Add Rate Limiting to Onboarding

**Files:**

- Modify: `src/app/onboarding/actions.ts:129` — add rate limiter before `completeOnboarding` logic
- Modify: `src/app/onboarding/actions.test.ts` — add rate limit test

- [ ] **Step 1: Write the failing test**

Add to `src/app/onboarding/actions.test.ts`:

Note: `completeOnboarding` has signature `(_prev: OnboardingState, formData: FormData)` — pass both args.

```typescript
it('rejects when rate limited', async () => {
  // Mock rate limiter to return false
  const { createRateLimiter } = await import('@/lib/rate-limit')
  vi.mocked(createRateLimiter).mockReturnValue({ check: vi.fn().mockResolvedValue(false) } as never)

  const { completeOnboarding } = await import('./actions')
  const formData = makeFormData({ displayName: 'Test' })
  const result = await completeOnboarding({ error: null }, formData)
  expect(result.error).toContain('Too many')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/onboarding/actions.test.ts`
Expected: FAIL — no rate limiting in completeOnboarding

- [ ] **Step 3: Add rate limiting to completeOnboarding**

In `src/app/onboarding/actions.ts`, add near the top:

```typescript
import { createRateLimiter } from '@/lib/rate-limit'

const onboardingLimiter = createRateLimiter({
  maxRequests: 5,
  windowSeconds: 3600, // 5 per hour per user
})
```

Inside `completeOnboarding`, after `requireAuth()`, add:

```typescript
const allowed = await onboardingLimiter.check(`onboarding:${user.id}`)
if (!allowed) {
  return { error: 'Too many attempts. Please try again later.' }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/onboarding/actions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/onboarding/actions.ts src/app/onboarding/actions.test.ts
git commit -m "feat(auth): add rate limiting to onboarding to prevent email spam"
```

---

## Phase 2: Missing Features

### Task 6: Password Reset Flow

**Files:**

- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/app/(auth)/forgot-password/actions.ts`
- Create: `src/app/(auth)/forgot-password/actions.test.ts`
- Create: `src/app/(auth)/reset-password/page.tsx`
- Create: `src/app/(auth)/reset-password/actions.ts`
- Create: `src/app/(auth)/reset-password/actions.test.ts`
- Modify: `src/app/(auth)/login/page.tsx` — add "Forgot password?" link
- Modify: `src/lib/supabase/middleware-utils.ts:18` — add `/forgot-password` and `/reset-password` to PUBLIC_ROUTES

**Flow:**

1. User clicks "Forgot password?" on login page → `/forgot-password`
2. User enters email, server action calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })` with rate limiting
3. User clicks link in email → `/reset-password?code=<code>`
4. Reset page exchanges code via `supabase.auth.exchangeCodeForSession(code)`, then shows new password form
5. User submits new password, server action calls `supabase.auth.updateUser({ password })`

- [ ] **Step 1: Write the failing test for forgot-password action**

Create `src/app/(auth)/forgot-password/actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '@/test/mocks/supabase'

let mockSupabase: ReturnType<typeof createMockSupabaseClient>

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({
    check: vi.fn().mockResolvedValue(true),
  }),
}))

beforeEach(async () => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabaseClient()
  const { createClient } = await import('@/lib/supabase/server')
  ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
})

describe('requestPasswordReset', () => {
  it('validates email format', async () => {
    const { requestPasswordReset } = await import('./actions')
    const result = await requestPasswordReset({ email: 'bad' })
    expect(result.error).toBeTruthy()
  })

  it('always returns success to prevent email enumeration', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    const { requestPasswordReset } = await import('./actions')
    const result = await requestPasswordReset({ email: 'test@example.com' })
    expect(result.error).toBeNull()
  })

  it('returns success even when Supabase errors to prevent enumeration', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'User not found' },
    })
    const { requestPasswordReset } = await import('./actions')
    const result = await requestPasswordReset({ email: 'nonexistent@example.com' })
    expect(result.error).toBeNull() // Don't leak whether email exists
  })

  it('rate limits requests', async () => {
    const { createRateLimiter } = await import('@/lib/rate-limit')
    vi.mocked(createRateLimiter).mockReturnValue({ check: vi.fn().mockResolvedValue(false) } as never)
    const { requestPasswordReset } = await import('./actions')
    const result = await requestPasswordReset({ email: 'test@example.com' })
    expect(result.error).toContain('Too many')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/(auth)/forgot-password/actions.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement forgot-password action**

Create `src/app/(auth)/forgot-password/actions.ts`:

```typescript
'use server'

import { headers } from 'next/headers'
import { z } from 'zod'

import { createRateLimiter } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

const resetLimiter = createRateLimiter({
  maxRequests: 3,
  windowSeconds: 3600, // 3 per hour per IP
})

export async function requestPasswordReset(input: { email: string }): Promise<{ error: string | null }> {
  const parsed = emailSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const headersList = await headers()
  const ip = headersList.get('x-real-ip') ?? headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await resetLimiter.check(`reset:${ip}`)
  if (!allowed) {
    return { error: 'Too many reset requests. Please try again later.' }
  }

  const supabase = await createClient()
  const baseUrl = headersList.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''

  // Always return success to prevent email enumeration
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${baseUrl}/reset-password`,
  })

  return { error: null }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/(auth)/forgot-password/actions.test.ts`
Expected: PASS

- [ ] **Step 5: Create forgot-password page**

Create `src/app/(auth)/forgot-password/page.tsx` — a form with email input and submit button. On success, show "Check your email" confirmation message. Style to match existing auth pages. Include a "Back to login" link.

- [ ] **Step 6: Write test + implement reset-password action**

Create `src/app/(auth)/reset-password/actions.ts` with `updatePassword` server action:

- Validates password (min 8 chars)
- Calls `supabase.auth.updateUser({ password })`
- Rate limited (5/hour per IP)

Create `src/app/(auth)/reset-password/actions.test.ts` with tests for validation, rate limiting, success, and Supabase errors.

- [ ] **Step 7: Create reset-password page**

Create `src/app/(auth)/reset-password/page.tsx` (server component):

> **Important:** With Supabase SSR + PKCE, the email link redirects to `/reset-password?code=<code>`. The code exchange must happen **server-side** (not client-side). Use the existing `/auth/callback` pattern as reference: the server component reads the `code` search param, exchanges it for a session via `supabase.auth.exchangeCodeForSession(code)`, then renders the client form.

- Server component reads `code` from `searchParams`
- Exchanges code for session server-side: `const supabase = await createClient(); await supabase.auth.exchangeCodeForSession(code)`
- If exchange fails, show error + "Request new link" CTA
- If exchange succeeds, render a client component `<ResetPasswordForm />` with new password + confirm password fields
- On submit, `ResetPasswordForm` calls `updatePassword` server action
- On success, shows confirmation + "Back to login" link

- [ ] **Step 8: Add "Forgot password?" link to login page**

Modify `src/app/(auth)/login/page.tsx` — add a link between the password field and submit button:

```tsx
<Link href="/forgot-password" className="text-sm text-primary hover:underline">
  Forgot your password?
</Link>
```

- [ ] **Step 9: Add routes to PUBLIC_ROUTES**

Modify `src/lib/supabase/middleware-utils.ts` — add `/forgot-password` and `/reset-password` to the `PUBLIC_ROUTES` array.

- [ ] **Step 10: Commit**

```bash
git add src/app/(auth)/forgot-password/ src/app/(auth)/reset-password/ \
        src/app/(auth)/login/page.tsx src/lib/supabase/middleware-utils.ts
git commit -m "feat(auth): add password reset flow with rate limiting"
```

---

### Task 7: Account Deletion

**Files:**

- Create: `src/app/(app)/settings/delete-account-actions.ts`
- Create: `src/app/(app)/settings/delete-account-actions.test.ts`
- Create: `src/components/settings/DeleteAccountPanel.tsx`
- Modify: `src/app/(app)/settings/settings-content.tsx` — add DeleteAccountPanel to Data & Privacy tab

Account deletion must:

1. Delete the user's Supabase Auth account (via admin client)
2. Cascade-delete all user data (profiles trigger should handle via couple_id)
3. Require password confirmation before deletion
4. Be rate limited

- [ ] **Step 1: Write the failing test**

Create `src/app/(app)/settings/delete-account-actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockUser = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'test@example.com' }
let mockSupabase: ReturnType<typeof createMockSupabaseClient>

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

beforeEach(async () => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabaseClient()
  const { requireAuth } = await import('@/lib/auth')
  ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: mockUser,
    supabase: mockSupabase,
  })
})

describe('deleteAccount', () => {
  it('requires password confirmation', async () => {
    const { deleteAccount } = await import('./delete-account-actions')
    const result = await deleteAccount({ password: '' })
    expect(result.error).toBeTruthy()
  })

  it('verifies password before deletion', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    })
    const { deleteAccount } = await import('./delete-account-actions')
    const result = await deleteAccount({ password: 'wrong' })
    expect(result.error).toContain('password')
  })

  it('deletes user account on valid password', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: mockUser }, error: null })
    const mockAdmin = { auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) } } }
    const { createAdminClient } = await import('@/lib/supabase/admin')
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(mockAdmin)

    const { deleteAccount } = await import('./delete-account-actions')
    const result = await deleteAccount({ password: 'correct' })
    expect(result.error).toBeNull()
    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(mockUser.id)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/(app)/settings/delete-account-actions.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement delete account action**

Create `src/app/(app)/settings/delete-account-actions.ts`:

```typescript
'use server'

import { z } from 'zod'

import { requireAuth } from '@/lib/auth'
import { createRateLimiter } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

const deleteSchema = z.object({
  password: z.string().min(1, 'Password is required to confirm deletion'),
})

const deleteLimiter = createRateLimiter({
  maxRequests: 3,
  windowSeconds: 3600, // 3 attempts per hour per user
})

export async function deleteAccount(input: { password: string }): Promise<{ error: string | null }> {
  const parsed = deleteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const { user, supabase } = await requireAuth()

  // Rate limit by user ID to prevent brute-force password guessing
  const allowed = await deleteLimiter.check(`delete-account:${user.id}`)
  if (!allowed) {
    return { error: 'Too many attempts. Please try again later.' }
  }

  // Verify password by attempting sign-in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: parsed.data.password,
  })

  if (signInError) {
    return { error: 'Incorrect password. Please try again.' }
  }

  // Delete via admin client (cascades through DB triggers/RLS)
  const admin = createAdminClient()
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)

  if (deleteError) {
    return { error: 'Failed to delete account. Please try again or contact support.' }
  }

  // Sign out the current session
  await supabase.auth.signOut()

  return { error: null }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/(app)/settings/delete-account-actions.test.ts`
Expected: PASS

- [ ] **Step 5: Create DeleteAccountPanel component**

Create `src/components/settings/DeleteAccountPanel.tsx`:

A "Danger Zone" card with:

- Warning text explaining deletion is permanent
- Password input for confirmation
- Two-step delete button (click to enable → click to confirm, same pattern as "Leave Couple")
- On success, redirect to `/login` with a toast
- Uses existing `Card`, `CardHeader`, `CardContent`, `Button`, `Input` from `@/components/ui`

- [ ] **Step 6: Add to settings page**

Modify `src/app/(app)/settings/settings-content.tsx` — in the Data & Privacy tab, add `<DeleteAccountPanel />` below the existing `<DataExportPanel />`, separated by a spacer. (Note: `page.tsx` is a server component that fetches data; `settings-content.tsx` is the client component that renders tabs.)

- [ ] **Step 7: Commit**

```bash
git add src/app/(app)/settings/delete-account-actions.ts \
        src/app/(app)/settings/delete-account-actions.test.ts \
        src/components/settings/DeleteAccountPanel.tsx \
        src/app/(app)/settings/settings-content.tsx
git commit -m "feat(settings): add account deletion with password confirmation"
```

---

## Phase 3: UX Polish

### Task 8: Fix Dark Mode on Auth Pages

**Files:**

- Modify: `src/app/(auth)/login/page.tsx` — replace hardcoded light colors with theme tokens
- Modify: `src/app/(auth)/signup/SignupForm.tsx` — same
- Modify: `src/app/(auth)/signup/WaitlistForm.tsx` — same
- Modify: `src/app/(auth)/forgot-password/page.tsx` — ensure dark mode from creation
- Modify: `src/app/(auth)/reset-password/page.tsx` — ensure dark mode from creation

**Replacements to make across all auth pages:**

| Hardcoded                     | Replace with                      |
| ----------------------------- | --------------------------------- |
| `bg-gray-50`                  | `bg-background`                   |
| `bg-white`                    | `bg-card`                         |
| `text-gray-900`               | `text-foreground`                 |
| `text-gray-600`               | `text-muted-foreground`           |
| `text-gray-700`               | `text-foreground`                 |
| `border-gray-300`             | `border-input`                    |
| `border-gray-200`             | `border-border`                   |
| `bg-blue-600` / `bg-blue-700` | `bg-primary` / `bg-primary/90`    |
| `text-white` (on buttons)     | `text-primary-foreground`         |
| `bg-pink-50`                  | `bg-primary/5 dark:bg-primary/10` |

- [ ] **Step 1: Fix login page dark mode**

Open `src/app/(auth)/login/page.tsx` and replace all hardcoded color classes with semantic theme tokens (list above). Test in both light and dark mode.

- [ ] **Step 2: Fix signup form dark mode**

Open `src/app/(auth)/signup/SignupForm.tsx` and apply same replacements.

- [ ] **Step 3: Fix waitlist form dark mode**

Open `src/app/(auth)/signup/WaitlistForm.tsx` and apply same replacements.

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`
Toggle dark mode (should be in system preferences or app settings).
Verify: Login, signup, and waitlist pages render correctly in both modes. No white/gray flashing, text readable on dark background.

- [ ] **Step 5: Commit**

```bash
git add src/app/(auth)/login/page.tsx src/app/(auth)/signup/SignupForm.tsx \
        src/app/(auth)/signup/WaitlistForm.tsx
git commit -m "fix(ui): add dark mode support to auth pages"
```

---

### Task 9: Fix Dark Mode on Check-in Page

**Files:**

- Modify: `src/app/(app)/checkin/page.tsx` — replace hardcoded light colors

Same replacement table as Task 8. Focus on:

- `text-gray-900` → `text-foreground`
- `text-gray-600` → `text-muted-foreground`
- `bg-white` → `bg-card`
- `border-gray-200` → `border-border`
- `bg-pink-50` → `bg-primary/5 dark:bg-primary/10`

- [ ] **Step 1: Replace hardcoded colors**

Open `src/app/(app)/checkin/page.tsx` and apply replacements throughout.

- [ ] **Step 2: Verify in browser**

Start a check-in session in dark mode. Verify all steps render correctly.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/checkin/page.tsx
git commit -m "fix(ui): add dark mode support to check-in page"
```

---

### Task 10: Add Check-in Loading Skeleton

**Files:**

- Create: `src/app/(app)/checkin/loading.tsx`

Follow the pattern from `src/app/(app)/dashboard/loading.tsx`.

- [ ] **Step 1: Create loading skeleton**

Create `src/app/(app)/checkin/loading.tsx`:

```tsx
import { PageContainer } from '@/components/layout/PageContainer'
import { Skeleton } from '@/components/ui/skeleton'

export default function CheckInLoading() {
  return (
    <PageContainer title="Check-In" description="Loading your session..." className="space-y-8">
      {/* Session rules skeleton */}
      <Skeleton variant="card" className="h-16" />

      {/* Quick start + categories skeleton */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Skeleton variant="card" className="h-48" />
        <Skeleton variant="card" className="h-48" />
      </div>

      {/* Recent check-ins skeleton */}
      <Skeleton variant="card" className="h-32" />
    </PageContainer>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run dev`, navigate to `/checkin`. Briefly see the skeleton before content loads.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/checkin/loading.tsx
git commit -m "feat(ui): add loading skeleton to check-in page"
```

---

### Task 11: Auth Form Accessibility

**Files:**

- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/signup/SignupForm.tsx`
- Modify: `src/app/(auth)/signup/WaitlistForm.tsx`

Add the following accessibility attributes:

- [ ] **Step 1: Fix login page**

In `src/app/(auth)/login/page.tsx`:

- Add `aria-required="true"` to email and password inputs
- Add `aria-invalid={!!error}` to the form or inputs when errors exist
- Add `aria-describedby="login-error"` to the form when error is shown
- Add `id="login-error" aria-live="polite" role="alert"` to the error message div
- Add `aria-busy={isLoading}` to the submit button
- Add `autocomplete="email"` to email input
- Add `autocomplete="current-password"` to password input

- [ ] **Step 2: Fix signup form**

In `src/app/(auth)/signup/SignupForm.tsx`:

- Same pattern as login page
- Use `autocomplete="new-password"` for password
- Add `aria-live="polite"` to success message div

- [ ] **Step 3: Fix waitlist form**

In `src/app/(auth)/signup/WaitlistForm.tsx`:

- Same pattern for error/success messages
- Add `autocomplete="email"` to email input

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/login/page.tsx src/app/(auth)/signup/SignupForm.tsx \
        src/app/(auth)/signup/WaitlistForm.tsx
git commit -m "fix(a11y): add aria attributes to auth forms"
```

---

### Task 12: Add AlertDialog for Destructive Actions

**Files:**

- Create: `src/components/ui/alert-dialog.tsx` (via shadcn CLI)
- Create: `src/components/ui/ConfirmDeleteDialog.tsx`
- Modify: `src/app/(app)/love-languages/page.tsx:145-149` — replace `confirm()`
- Modify: `src/app/(app)/love-languages/actions/page.tsx:43-47` — replace `confirm()`
- Modify: `src/app/(app)/notes/notes-content.tsx:137` — add confirmation before bulk delete
- Modify: `src/app/(app)/requests/requests-content.tsx:124` — add confirmation before delete

- [ ] **Step 1: Install AlertDialog from shadcn**

Run: `npx shadcn@latest add alert-dialog`

This creates `src/components/ui/alert-dialog.tsx` with the Radix AlertDialog primitives.

- [ ] **Step 2: Create reusable ConfirmDeleteDialog**

Create `src/components/ui/ConfirmDeleteDialog.tsx`:

```tsx
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
}

export function ConfirmDeleteDialog({ open, onOpenChange, title, description, onConfirm }: Props): React.ReactElement {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 3: Replace confirm() in love-languages page**

Modify `src/app/(app)/love-languages/page.tsx`:

- Add state: `const [deleteTarget, setDeleteTarget] = useState<string | null>(null)`
- Replace `handleDelete` body: instead of `if (confirm(...))`, set `setDeleteTarget(id)`
- Add `<ConfirmDeleteDialog>` at end of JSX, with `onConfirm={() => { void deleteLanguage(deleteTarget!); setDeleteTarget(null) }}`

- [ ] **Step 4: Replace confirm() in love-languages actions page**

Same pattern for `src/app/(app)/love-languages/actions/page.tsx:43-47`.

- [ ] **Step 5: Add confirmation dialog before bulk delete notes**

Note: `notes-content.tsx:137` does NOT use `confirm()` — it directly calls `bulkDeleteNotes(ids)` with no confirmation at all. Add one.

Modify `src/app/(app)/notes/notes-content.tsx`:

- Add state: `const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)`
- Change the bulk delete button to call `setShowBulkDeleteConfirm(true)` instead of `handleBulkDelete` directly
- Add `<ConfirmDeleteDialog>` with `onConfirm={handleBulkDelete}`, description shows count of selected notes

- [ ] **Step 6: Add confirmation dialog before request deletion**

Note: `requests-content.tsx:124` does NOT use `confirm()` — it directly calls `deleteRequest(id)` with no confirmation. Add one.

Modify `src/app/(app)/requests/requests-content.tsx`:

- Add state: `const [deleteTarget, setDeleteTarget] = useState<string | null>(null)`
- Change `handleDelete` to set `deleteTarget` instead of immediately deleting
- Add `<ConfirmDeleteDialog>` with `onConfirm` calling the existing optimistic delete logic

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/alert-dialog.tsx src/components/ui/ConfirmDeleteDialog.tsx \
        src/app/(app)/love-languages/page.tsx src/app/(app)/love-languages/actions/page.tsx \
        src/app/(app)/notes/notes-content.tsx src/app/(app)/requests/requests-content.tsx
git commit -m "feat(ui): replace browser confirm() with styled AlertDialog for destructive actions"
```

---

### Task 13: Add CTA Button to Waitlist Confirmation Email

**Files:**

- Modify: `src/lib/email/templates/waitlist-confirmation.tsx`

- [ ] **Step 1: Add CTA button**

In `src/lib/email/templates/waitlist-confirmation.tsx`, after the main body paragraphs and before the footer, add a CTA button:

```tsx
<Section style={{ textAlign: 'center', margin: '32px 0' }}>
  <Button
    href="https://qualitycouple.com"
    style={{
      backgroundColor: '#e11d48',
      color: '#ffffff',
      padding: '12px 24px',
      borderRadius: '8px',
      textDecoration: 'none',
      fontWeight: '600',
      fontSize: '16px',
    }}
  >
    Visit QC
  </Button>
</Section>
```

Import `Button` and `Section` from `@react-email/components` if not already imported.

- [ ] **Step 2: Preview the email**

Run the React Email dev server or render the template to verify it looks correct.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email/templates/waitlist-confirmation.tsx
git commit -m "feat(email): add CTA button to waitlist confirmation email"
```

---

## Phase 4: Test Coverage

### Task 14: Test joinWaitlist Server Action

**Files:**

- Create: `src/app/(auth)/signup/actions.test.ts`

- [ ] **Step 1: Write tests**

Test cases:

- Validation error (invalid email format)
- Rate limiting (returns error when over limit)
- Duplicate email (returns success silently, no duplicate insert)
- Happy path (inserts into waitlist, adds to Resend audience, sends confirmation email)
- Resend failure (non-blocking, still returns success)
- DB insert failure (returns error)

Follow the pattern from `src/app/onboarding/actions.test.ts` for mocking.

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/app/(auth)/signup/actions.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/(auth)/signup/actions.test.ts
git commit -m "test: add unit tests for joinWaitlist server action"
```

---

### Task 15: Test cleanup-storage Cron Job

**Files:**

- Create: `src/app/api/cron/cleanup-storage/route.test.ts`

- [ ] **Step 1: Write tests**

Follow the pattern from `src/app/api/cron/send-reminders/route.test.ts`.

Test cases:

- Returns 401 with no auth header
- Returns 401 with wrong CRON_SECRET
- Returns 401 when CRON_SECRET env var is not set
- Returns 200 with empty storage (nothing to clean up)
- Returns 200 with all objects referenced (nothing to delete)
- Correctly identifies orphaned objects (not in milestones.photo_url)
- Respects 24-hour grace period (doesn't delete recent uploads)
- Handles storage list error gracefully
- Handles milestone query error gracefully
- Reports correct counts (checked, deleted, errors)

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/app/api/cron/cleanup-storage/route.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/cleanup-storage/route.test.ts
git commit -m "test: add unit tests for storage cleanup cron job"
```

---

### Task 16: Test bookends-reducer

**Files:**

- Create: `src/contexts/bookends-reducer.test.ts`

- [ ] **Step 1: Write tests**

Test each of the 12 action types:

- `SET_SHOW_PREP_MODAL` / `SET_SHOW_REFLECTION_MODAL` — toggles modal state
- `ADD_MY_TOPIC` / `REMOVE_MY_TOPIC` / `REORDER_MY_TOPICS` — manages topic list
- `ADD_PARTNER_TOPIC` / `REMOVE_PARTNER_TOPIC` / `REORDER_PARTNER_TOPICS` — manages partner topics
- `LOAD_STATE` — loads full state from storage
- `RESET` — returns to initial state
- `SET_REFLECTION_NOTES` — updates reflection text
- `SET_GRATITUDE` — updates gratitude text

Also test:

- `loadPrepTopicsFromStorage()` — returns null for missing/invalid JSON, parses valid JSON
- `savePrepTopicsToStorage()` — saves to localStorage, removes when empty
- `createNewPreparation()` — generates UUID, timestamps, empty topics

Mock `localStorage` in `beforeEach`.

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/contexts/bookends-reducer.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/contexts/bookends-reducer.test.ts
git commit -m "test: add unit tests for bookends reducer (12 action types)"
```

---

### Task 17: Test useCheckInMutations

**Files:**

- Create: `src/contexts/useCheckInMutations.test.ts`

- [ ] **Step 1: Write tests**

This is a hooks file. Test the underlying functions rather than the hooks directly (or use `@testing-library/react-hooks` if the project has it).

Test mutation functions:

- `addDraftNote` — dispatches ADD_DRAFT_NOTE action
- `updateDraftNote` — dispatches UPDATE_DRAFT_NOTE action
- `removeDraftNote` — dispatches REMOVE_DRAFT_NOTE action
- `addActionItem` — dispatches ADD_ACTION_ITEM action
- `updateActionItem` — dispatches UPDATE_ACTION_ITEM action
- `removeActionItem` — dispatches REMOVE_ACTION_ITEM action
- `toggleActionItem` — dispatches TOGGLE_ACTION_ITEM action
- Error handling — failed DB operations dispatch SET_ERROR

Mock the `checkin-operations` module functions that each mutation calls.

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/contexts/useCheckInMutations.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/contexts/useCheckInMutations.test.ts
git commit -m "test: add unit tests for check-in mutation hooks"
```

---

### Task 18: Test Remaining couples.ts Functions

**Files:**

- Modify: `src/lib/couples.test.ts` — add tests for 6 untested functions

- [ ] **Step 1: Add tests for joinCouple, leaveCouple, createInvite, resendInvite, getInviteStatusByToken, acceptInvite**

For each function, test:

- Happy path
- Unauthenticated user (returns error)
- Database error (returns error)
- Edge cases specific to each (e.g., expired invite for `getInviteStatusByToken`, already accepted for `acceptInvite`)

Follow the existing test pattern in the file for mocking.

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/lib/couples.test.ts`
Expected: PASS (all existing + new tests)

- [ ] **Step 3: Commit**

```bash
git add src/lib/couples.test.ts
git commit -m "test: add unit tests for remaining couples.ts functions"
```

---

## Phase 5: Performance

### Task 19: Add Indexes on Foreign Keys

**Files:**

- Create: `supabase/migrations/00034_add_foreign_key_indexes.sql`

The Supabase performance advisor flagged 25 unindexed foreign keys. The most critical are `couple_id` columns (used in every RLS policy evaluation).

- [ ] **Step 1: Write the migration**

```sql
-- 00034_add_foreign_key_indexes.sql
-- Add indexes on foreign keys flagged by Supabase performance advisor.
-- Most critical: couple_id (used in every RLS policy evaluation).

-- couple_id indexes (used in RLS on every query)
CREATE INDEX IF NOT EXISTS idx_check_ins_couple_id ON public.check_ins (couple_id);
CREATE INDEX IF NOT EXISTS idx_notes_couple_id ON public.notes (couple_id);
CREATE INDEX IF NOT EXISTS idx_action_items_couple_id ON public.action_items (couple_id);
CREATE INDEX IF NOT EXISTS idx_milestones_couple_id ON public.milestones (couple_id);
CREATE INDEX IF NOT EXISTS idx_reminders_couple_id ON public.reminders (couple_id);
CREATE INDEX IF NOT EXISTS idx_requests_couple_id ON public.requests (couple_id);
CREATE INDEX IF NOT EXISTS idx_love_languages_couple_id ON public.love_languages (couple_id);
CREATE INDEX IF NOT EXISTS idx_love_actions_couple_id ON public.love_actions (couple_id);
CREATE INDEX IF NOT EXISTS idx_couple_invites_couple_id ON public.couple_invites (couple_id);
CREATE INDEX IF NOT EXISTS idx_profiles_couple_id ON public.profiles (couple_id);
CREATE INDEX IF NOT EXISTS idx_categories_couple_id ON public.categories (couple_id);
CREATE INDEX IF NOT EXISTS idx_love_language_discoveries_couple_id ON public.love_language_discoveries (couple_id);
CREATE INDEX IF NOT EXISTS idx_session_settings_couple_id ON public.session_settings (couple_id);

-- Other frequently-queried foreign keys
CREATE INDEX IF NOT EXISTS idx_notes_author_id ON public.notes (author_id);
CREATE INDEX IF NOT EXISTS idx_notes_check_in_id ON public.notes (check_in_id);
CREATE INDEX IF NOT EXISTS idx_action_items_check_in_id ON public.action_items (check_in_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assigned_to ON public.action_items (assigned_to);
CREATE INDEX IF NOT EXISTS idx_love_languages_user_id ON public.love_languages (user_id);
CREATE INDEX IF NOT EXISTS idx_love_actions_linked_language_id ON public.love_actions (linked_language_id);
CREATE INDEX IF NOT EXISTS idx_love_language_discoveries_user_id ON public.love_language_discoveries (user_id);
CREATE INDEX IF NOT EXISTS idx_love_language_discoveries_check_in_id ON public.love_language_discoveries (check_in_id);
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON public.reminders (created_by);
CREATE INDEX IF NOT EXISTS idx_reminders_assigned_to ON public.reminders (assigned_to);
CREATE INDEX IF NOT EXISTS idx_reminders_related_action_item_id ON public.reminders (related_action_item_id);
CREATE INDEX IF NOT EXISTS idx_reminders_related_check_in_id ON public.reminders (related_check_in_id);
CREATE INDEX IF NOT EXISTS idx_requests_requested_by ON public.requests (requested_by);
CREATE INDEX IF NOT EXISTS idx_requests_requested_for ON public.requests (requested_for);
CREATE INDEX IF NOT EXISTS idx_couple_invites_invited_by ON public.couple_invites (invited_by);
-- Note: session_settings_proposals.couple_id already indexed in migration 00014
CREATE INDEX IF NOT EXISTS idx_session_settings_proposals_proposed_by ON public.session_settings_proposals (proposed_by);
CREATE INDEX IF NOT EXISTS idx_session_settings_proposals_reviewed_by ON public.session_settings_proposals (reviewed_by);
```

- [ ] **Step 2: Apply locally and test**

Run: `make db-push`
Verify: `\di public.*` in psql shows all new indexes.
Run: `npm run test` — ensure no regressions.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00034_add_foreign_key_indexes.sql
git commit -m "perf(db): add indexes on all foreign keys for RLS query performance"
```

---

## Phase 6: Cleanup

### Task 20: Add `subscriptions` Table Write Policies

**Files:**

- Create: `supabase/migrations/00035_subscriptions_policies.sql`

The `subscriptions` table only has 1 SELECT policy. If it's intended to be managed only by the admin client (Stripe webhooks), this is fine — but we should be explicit. Add restrictive policies that prevent user writes.

- [ ] **Step 1: Verify intent**

Check how `subscriptions` is written to in the codebase:

```bash
grep -r "subscriptions" src/ --include="*.ts" --include="*.tsx" -l
```

If all writes go through `createAdminClient()`, the current setup is correct (admin bypasses RLS). If any writes use the user client, we need INSERT/UPDATE policies.

- [ ] **Step 2: Write migration if needed**

If admin-only (likely):

```sql
-- 00035_subscriptions_policies.sql
-- Explicitly document that subscriptions is admin-write-only.
-- No INSERT/UPDATE/DELETE policies = only service_role can write.
-- Add a comment for documentation.
COMMENT ON TABLE public.subscriptions IS 'Managed by admin client (Stripe webhooks). No user-level write policies by design.';
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00035_subscriptions_policies.sql
git commit -m "docs(db): document subscriptions table admin-only write intent"
```

---

### Task 21: Remove Unused Indexes

**Files:**

- Create: `supabase/migrations/00036_drop_unused_indexes.sql`

The performance advisor flagged 7 unused indexes. Drop them to save write overhead. Only drop after verifying they're truly unused (some may just be new tables with no traffic yet — wait until after beta has traffic before dropping).

> **Note:** Skip this task until after 2+ weeks of beta traffic. The indexes were created recently and may not have been used yet simply because the tables are new. Re-run the performance advisor after beta launch to confirm they're still unused.

---

### Task 22: Fix `#main-content` Target for Skip Link

**Files:**

- Modify: `src/components/layout/PageContainer.tsx` — add `id="main-content"` to the main content wrapper

The skip-to-content link in `src/app/layout.tsx:56-61` already exists and points to `#main-content`, but the target ID may be missing from the page content area.

- [ ] **Step 1: Check PageContainer**

Read `src/components/layout/PageContainer.tsx`. If the `<main>` or primary content `<div>` doesn't have `id="main-content"`, add it to the outermost wrapper element.

- [ ] **Step 2: Verify**

Tab-focus from the top of any page. The "Skip to content" link should appear and jump to the main content area when activated.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/PageContainer.tsx
git commit -m "fix(a11y): add #main-content target for skip-to-content link"
```

---

## Execution Order Summary

| Priority        | Tasks | Effort   | Description                                      |
| --------------- | ----- | -------- | ------------------------------------------------ |
| **Before beta** | 1-5   | ~4 hours | Critical security fixes + rate limiting          |
| **Before beta** | 6-7   | ~3 hours | Password reset + account deletion                |
| **First week**  | 8-13  | ~3 hours | Dark mode, a11y, confirmations, loading skeleton |
| **First week**  | 14-18 | ~4 hours | Test coverage for critical untested code         |
| **First week**  | 19    | ~30 min  | DB indexes for performance                       |
| **Later**       | 20-22 | ~1 hour  | Cleanup + documentation                          |

**Total estimated effort:** ~15-16 hours across all tasks.

**Parallelization opportunities:**

- Tasks 2 + 3 (DB migrations) can be combined into one migration if done together
- Tasks 8 + 9 + 11 (dark mode + loading skeleton) are independent
- Tasks 14-18 (test coverage) are fully independent of each other
- Phase 3 (UX) and Phase 4 (tests) are fully independent of each other
