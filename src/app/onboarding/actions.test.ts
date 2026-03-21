import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockUser = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }
const mockCoupleId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const mockInviteToken = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

let mockSupabase: ReturnType<typeof createMockSupabaseClient>

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/couples', () => ({
  createCouple: vi.fn(),
  createInvite: vi.fn(),
}))
vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
  shouldSendEmail: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/lib/email/templates/invite', () => ({
  InviteEmail: vi.fn().mockReturnValue(null),
}))
vi.mock('@/lib/email/templates/welcome', () => ({
  WelcomeEmail: vi.fn().mockReturnValue(null),
}))
const mockRateLimitCheck = vi.fn().mockResolvedValue(true)
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn().mockReturnValue({
    check: mockRateLimitCheck,
  }),
}))
class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT:${url}`)
  }
}

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new RedirectError(url)
  }),
}))

beforeEach(async () => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabaseClient()

  const { requireAuth } = await import('@/lib/auth')
  ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: mockUser,
    supabase: mockSupabase,
  })

  const { createClient } = await import('@/lib/supabase/server')
  ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
})

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.append(k, v)
  return fd
}

describe('completeOnboarding', () => {
  it('completes onboarding happy path', async () => {
    const { completeOnboarding } = await import('./actions')
    const { createCouple, createInvite } = await import('@/lib/couples')
    const { sendEmail } = await import('@/lib/email/send')
    const { redirect } = await import('next/navigation')

    // Profile update succeeds
    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({ data: null, error: null })
    ;(createCouple as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: mockCoupleId },
      error: null,
    })
    ;(createInvite as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { token: mockInviteToken },
      error: null,
    })
    ;(sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const fd = makeFormData({
      displayName: 'Jeremy',
      partnerEmail: 'partner@example.com',
    })
    await expect(completeOnboarding({ error: null }, fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')

    expect(createCouple).toHaveBeenCalledWith('Jeremy', mockSupabase)
    expect(createInvite).toHaveBeenCalledWith('partner@example.com', mockSupabase)
    expect(sendEmail).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })

  it('returns error when display name is missing', async () => {
    const { completeOnboarding } = await import('./actions')

    const fd = makeFormData({ displayName: '', partnerEmail: 'partner@example.com' })
    const result = await completeOnboarding({ error: null }, fd)

    expect(result.error).toBeTruthy()
    expect(result.error).toContain('Name is required')
  })

  it('returns error when partner email is invalid', async () => {
    const { completeOnboarding } = await import('./actions')

    const fd = makeFormData({ displayName: 'Jeremy', partnerEmail: 'not-an-email' })
    const result = await completeOnboarding({ error: null }, fd)

    expect(result.error).toBeTruthy()
  })

  it('returns error when profile update fails', async () => {
    const { completeOnboarding } = await import('./actions')

    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({
      data: null,
      error: { message: 'Profile update failed' },
    })

    const fd = makeFormData({ displayName: 'Jeremy', partnerEmail: 'partner@example.com' })
    const result = await completeOnboarding({ error: null }, fd)

    expect(result.error).toBe('Failed to update profile. Please try again.')
  })

  it('returns error when couple creation fails', async () => {
    const { completeOnboarding } = await import('./actions')
    const { createCouple } = await import('@/lib/couples')

    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({ data: null, error: null })
    ;(createCouple as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: 'Couple creation failed',
    })

    const fd = makeFormData({ displayName: 'Jeremy', partnerEmail: 'partner@example.com' })
    const result = await completeOnboarding({ error: null }, fd)

    expect(result.error).toBe('Couple creation failed')
  })

  it('returns error when rate limit is exceeded', async () => {
    const { completeOnboarding } = await import('./actions')
    mockRateLimitCheck.mockResolvedValueOnce(false)

    const fd = makeFormData({ displayName: 'Jeremy', partnerEmail: 'partner@example.com' })
    const result = await completeOnboarding({ error: null }, fd)

    expect(result.error).toBe('Too many attempts. Please try again later.')
  })

  it('returns partial success when invite creation fails', async () => {
    const { completeOnboarding } = await import('./actions')
    const { createCouple, createInvite } = await import('@/lib/couples')

    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({ data: null, error: null })
    ;(createCouple as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: mockCoupleId },
      error: null,
    })
    ;(createInvite as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: 'Invite failed',
    })

    const fd = makeFormData({ displayName: 'Jeremy', partnerEmail: 'partner@example.com' })
    const result = await completeOnboarding({ error: null }, fd)

    expect(result).toEqual({ error: null, success: true, emailSent: false })
  })
})

describe('completeOnboarding - edge cases', () => {
  it('does not crash on malformed JSON in selectedLanguages', async () => {
    const { completeOnboarding } = await import('./actions')
    const { createCouple, createInvite } = await import('@/lib/couples')
    const { sendEmail } = await import('@/lib/email/send')
    const { redirect } = await import('next/navigation')

    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({ data: null, error: null })
    ;(createCouple as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: mockCoupleId },
      error: null,
    })
    ;(createInvite as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { token: mockInviteToken },
      error: null,
    })
    ;(sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const fd = makeFormData({
      displayName: 'Jeremy',
      partnerEmail: 'partner@example.com',
      selectedLanguages: '{not valid json!!!',
    })
    await expect(completeOnboarding({ error: null }, fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')

    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })

  it('does not crash on non-array JSON in selectedLanguages', async () => {
    const { completeOnboarding } = await import('./actions')
    const { createCouple, createInvite } = await import('@/lib/couples')
    const { sendEmail } = await import('@/lib/email/send')
    const { redirect } = await import('next/navigation')

    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({ data: null, error: null })
    ;(createCouple as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: mockCoupleId },
      error: null,
    })
    ;(createInvite as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { token: mockInviteToken },
      error: null,
    })
    ;(sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const fd = makeFormData({
      displayName: 'Jeremy',
      partnerEmail: 'partner@example.com',
      selectedLanguages: '"just a string"',
    })
    await expect(completeOnboarding({ error: null }, fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')

    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })

  it('returns partial success when invite email send fails', async () => {
    const { completeOnboarding } = await import('./actions')
    const { createCouple, createInvite } = await import('@/lib/couples')
    const { sendEmail } = await import('@/lib/email/send')

    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({ data: null, error: null })
    ;(createCouple as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: mockCoupleId },
      error: null,
    })
    ;(createInvite as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { token: mockInviteToken },
      error: null,
    })
    ;(sendEmail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('RESEND_API_KEY not configured'))

    const fd = makeFormData({ displayName: 'Jeremy', partnerEmail: 'partner@example.com' })
    const result = await completeOnboarding({ error: null }, fd)

    expect(result).toEqual({ error: null, success: true, emailSent: false })
  })
})
