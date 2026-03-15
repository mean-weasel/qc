import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockUser = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }

let mockSupabase: ReturnType<typeof createMockSupabaseClient>

vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/couples', () => ({
  leaveCouple: vi.fn(),
  resendInvite: vi.fn(),
}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
  shouldSendEmail: vi.fn(),
}))
vi.mock('@/lib/data-export', () => ({ exportUserData: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: vi.fn().mockResolvedValue(true),
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
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
})

describe('updateProfile', () => {
  it('accepts null avatar_url', async () => {
    const { updateProfile } = await import('./actions/profile')
    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({ data: null, error: null })

    const fd = new FormData()
    fd.append('display_name', 'Test User')
    // avatar_url intentionally omitted -> null

    const result = await updateProfile({}, fd)
    expect(result).toEqual({ success: true })
  })

  it('rejects invalid avatar_url', async () => {
    const { updateProfile } = await import('./actions/profile')

    const fd = new FormData()
    fd.append('display_name', 'Test User')
    fd.append('avatar_url', 'not-a-url')

    const result = await updateProfile({}, fd)
    expect(result.error).toBeTruthy()
  })
})

describe('resendInviteAction — email flow', () => {
  const mockCoupleId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

  function setupCoupleAndInviteOwnership(): void {
    // 1. Profile lookup for couple_id
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
    // 2. Invite ownership check
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
  }

  it('sends email when invite has data and email is deliverable', async () => {
    const { resendInviteAction } = await import('./actions/profile')
    const { resendInvite } = await import('@/lib/couples')
    const { shouldSendEmail, sendEmail } = await import('@/lib/email/send')
    const { createAdminClient } = await import('@/lib/supabase/admin')

    setupCoupleAndInviteOwnership()

    const inviteData = { token: 'abc', invited_email: 'partner@test.com' }
    ;(resendInvite as ReturnType<typeof vi.fn>).mockResolvedValue({ data: inviteData, error: null })
    ;(shouldSendEmail as ReturnType<typeof vi.fn>).mockResolvedValue(true)

    // 3. Profile lookup for inviter name
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { display_name: 'Alice' },
      error: null,
    })

    // Admin client for invitee profile lookup
    const adminChain = createMockSupabaseClient()
    adminChain._queryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { email_unsubscribe_token: 'unsub-token' },
      error: null,
    })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminChain)
    ;(sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const result = await resendInviteAction('invite-id')

    expect(result).toEqual({})
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'partner@test.com',
        subject: 'Alice invited you to QC',
      }),
    )
  })

  it('returns error when shouldSendEmail returns false', async () => {
    const { resendInviteAction } = await import('./actions/profile')
    const { resendInvite } = await import('@/lib/couples')
    const { shouldSendEmail } = await import('@/lib/email/send')

    setupCoupleAndInviteOwnership()

    const inviteData = { token: 'abc', invited_email: 'blocked@test.com' }
    ;(resendInvite as ReturnType<typeof vi.fn>).mockResolvedValue({ data: inviteData, error: null })
    ;(shouldSendEmail as ReturnType<typeof vi.fn>).mockResolvedValue(false)

    const result = await resendInviteAction('invite-id')

    expect(result.error).toBe('Unable to send to this email address')
  })

  it('does not fail when sendEmail throws', async () => {
    const { resendInviteAction } = await import('./actions/profile')
    const { resendInvite } = await import('@/lib/couples')
    const { shouldSendEmail, sendEmail } = await import('@/lib/email/send')
    const { createAdminClient } = await import('@/lib/supabase/admin')

    setupCoupleAndInviteOwnership()
    ;(resendInvite as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { token: 'abc', invited_email: 'p@test.com' },
      error: null,
    })
    ;(shouldSendEmail as ReturnType<typeof vi.fn>).mockResolvedValue(true)
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { display_name: null },
      error: null,
    })
    const adminChain = createMockSupabaseClient()
    adminChain._queryBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(adminChain)
    ;(sendEmail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('RESEND_API_KEY missing'))

    const result = await resendInviteAction('invite-id')

    // Should still succeed — email failure is swallowed
    expect(result).toEqual({})
  })
})

describe('updateCoupleSettings', () => {
  it('returns error for invalid setting key', async () => {
    const { updateCoupleSettings } = await import('./actions/profile')

    const result = await updateCoupleSettings('invalidKey', true)
    expect(result.error).toBe('Invalid setting key')
  })

  it('returns error when profile has no couple_id', async () => {
    const { updateCoupleSettings } = await import('./actions/profile')
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: null },
      error: null,
    })

    const result = await updateCoupleSettings('privateByDefault', true)
    expect(result.error).toBe('No couple found')
  })
})

describe('exportUserData', () => {
  it('delegates to data-export module', async () => {
    const { exportUserData } = await import('./actions/profile')
    const dataExport = await import('@/lib/data-export')

    ;(dataExport.exportUserData as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { version: '1.0.0' },
      error: null,
    })

    const result = await exportUserData()

    expect(result.data).toEqual({ version: '1.0.0' })
    expect(dataExport.exportUserData).toHaveBeenCalledWith(mockSupabase, mockUser.id)
  })
})
