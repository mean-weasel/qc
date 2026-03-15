import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockUser = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }
const mockCoupleId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

let mockSupabase: ReturnType<typeof createMockSupabaseClient>

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))
vi.mock('@/lib/couples', () => ({
  leaveCouple: vi.fn(),
  resendInvite: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: vi.fn().mockResolvedValue(true),
  })),
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
})

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.append(k, v)
  return fd
}

describe('updateProfile', () => {
  it('updates profile with valid name', async () => {
    const { updateProfile } = await import('./actions')

    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({ data: null, error: null })

    const fd = makeFormData({ display_name: 'New Name' })
    const result = await updateProfile({}, fd)

    expect(result).toEqual({ success: true })
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
  })

  it('returns error when name is empty', async () => {
    const { updateProfile } = await import('./actions')

    const fd = makeFormData({ display_name: '' })
    const result = await updateProfile({}, fd)

    expect(result.error).toBeTruthy()
    expect(result.error).toContain('Name is required')
  })

  it('returns error on database failure', async () => {
    const { updateProfile } = await import('./actions')

    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({
      data: null,
      error: { message: 'Update failed' },
    })

    const fd = makeFormData({ display_name: 'Valid Name' })
    const result = await updateProfile({}, fd)

    expect(result.error).toBe('Something went wrong. Please try again.')
  })
})

describe('updateSessionSettings', () => {
  const validSettings = {
    session_duration: '15',
    timeouts_per_partner: '2',
    timeout_duration: '3',
    turn_based_mode: 'true',
    turn_duration: '120',
    allow_extensions: 'true',
    warm_up_questions: 'true',
    cool_down_time: '5',
  }

  it('updates session settings with valid data', async () => {
    const { updateSessionSettings } = await import('./actions')

    // Profile lookup: from('profiles').select().eq().single()
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
    // eq is called twice: once for profile select chain (needs to return _queryBuilder for .single()),
    // once for session_settings update chain (terminal)
    mockSupabase._queryBuilder.eq = vi
      .fn()
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockReturnValueOnce({ data: null, error: null })
    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)

    const fd = makeFormData(validSettings)
    const result = await updateSessionSettings({}, fd)

    expect(result).toEqual({ success: true })
    expect(mockSupabase.from).toHaveBeenCalledWith('session_settings')
  })

  it('returns error when user has no couple', async () => {
    const { updateSessionSettings } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: null },
      error: null,
    })

    const fd = makeFormData(validSettings)
    const result = await updateSessionSettings({}, fd)

    expect(result.error).toBe('You must be in a couple to update session settings')
  })

  it('returns error on database failure', async () => {
    const { updateSessionSettings } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
    mockSupabase._queryBuilder.eq = vi
      .fn()
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockReturnValueOnce({ data: null, error: { message: 'Settings update failed' } })
    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)

    const fd = makeFormData(validSettings)
    const result = await updateSessionSettings({}, fd)

    expect(result.error).toBe('Something went wrong. Please try again.')
  })
})

describe('leaveCoupleAction', () => {
  it('leaves couple and redirects to onboarding', async () => {
    const { leaveCoupleAction } = await import('./actions')
    const { leaveCouple } = await import('@/lib/couples')
    const { redirect } = await import('next/navigation')

    ;(leaveCouple as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null })

    await expect(leaveCoupleAction()).rejects.toThrow('NEXT_REDIRECT:/onboarding')

    expect(leaveCouple).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith('/onboarding')
  })

  it('returns error when leaveCouple fails', async () => {
    const { leaveCoupleAction } = await import('./actions')
    const { leaveCouple } = await import('@/lib/couples')

    ;(leaveCouple as ReturnType<typeof vi.fn>).mockResolvedValue({ error: 'Leave failed' })

    const result = await leaveCoupleAction()

    expect(result).toEqual({ error: 'Leave failed' })
  })
})

describe('resendInviteAction', () => {
  it('resends an invite successfully', async () => {
    const { resendInviteAction } = await import('./actions')
    const { resendInvite } = await import('@/lib/couples')

    // Profile lookup for couple_id
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
    // Invite ownership check
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
    ;(resendInvite as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null })

    const result = await resendInviteAction('cccccccc-cccc-4ccc-8ccc-cccccccccccc')

    expect(result).toEqual({})
    expect(resendInvite).toHaveBeenCalledWith('cccccccc-cccc-4ccc-8ccc-cccccccccccc')
  })

  it('returns error when resendInvite fails', async () => {
    const { resendInviteAction } = await import('./actions')
    const { resendInvite } = await import('@/lib/couples')

    // Profile lookup for couple_id
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
    // Invite ownership check
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
    ;(resendInvite as ReturnType<typeof vi.fn>).mockResolvedValue({ error: 'Resend failed' })

    const result = await resendInviteAction('cccccccc-cccc-4ccc-8ccc-cccccccccccc')

    expect(result).toEqual({ error: 'Resend failed' })
  })
})
