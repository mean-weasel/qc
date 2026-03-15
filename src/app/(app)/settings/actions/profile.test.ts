import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockUser = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }
const mockCoupleId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

let mockSupabase: ReturnType<typeof createMockSupabaseClient>

vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/couples', () => ({ leaveCouple: vi.fn(), resendInvite: vi.fn() }))
vi.mock('@/lib/data-export', () => ({ exportUserData: vi.fn() }))
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn(), shouldSendEmail: vi.fn() }))
vi.mock('@/lib/email/templates/invite', () => ({ InviteEmail: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: vi.fn().mockResolvedValue(true),
  })),
}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
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
  it('returns success on valid input', async () => {
    const { updateProfile } = await import('./profile')
    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({ data: null, error: null })

    const fd = new FormData()
    fd.append('display_name', 'Test User')
    const result = await updateProfile({}, fd)

    expect(result).toEqual({ success: true })
  })

  it('returns validation error on empty name', async () => {
    const { updateProfile } = await import('./profile')
    const fd = new FormData()
    fd.append('display_name', '')
    const result = await updateProfile({}, fd)

    expect(result.error).toBeTruthy()
  })

  it('returns db error when supabase fails', async () => {
    const { updateProfile } = await import('./profile')
    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({ data: null, error: { message: 'DB error' } })

    const fd = new FormData()
    fd.append('display_name', 'Valid Name')
    const result = await updateProfile({}, fd)

    expect(result.error).toBe('Something went wrong. Please try again.')
  })
})

describe('leaveCoupleAction', () => {
  it('calls leaveCouple and redirects', async () => {
    const { leaveCoupleAction } = await import('./profile')
    const { leaveCouple } = await import('@/lib/couples')
    ;(leaveCouple as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null })

    await expect(leaveCoupleAction()).rejects.toThrow('NEXT_REDIRECT:/onboarding')
  })

  it('returns error when leaveCouple fails', async () => {
    const { leaveCoupleAction } = await import('./profile')
    const { leaveCouple } = await import('@/lib/couples')
    ;(leaveCouple as ReturnType<typeof vi.fn>).mockResolvedValue({ error: 'Cannot leave' })

    const result = await leaveCoupleAction()
    expect(result.error).toBe('Cannot leave')
  })
})

describe('updateCoupleSettings', () => {
  it('returns error for invalid setting key', async () => {
    const { updateCoupleSettings } = await import('./profile')

    const result = await updateCoupleSettings('invalidKey', true)
    expect(result.error).toBe('Invalid setting key')
  })

  it('returns error when no couple found', async () => {
    const { updateCoupleSettings } = await import('./profile')
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: null },
      error: null,
    })

    const result = await updateCoupleSettings('privateByDefault', true)
    expect(result.error).toBe('No couple found')
  })

  it('calls rpc and returns success', async () => {
    const { updateCoupleSettings } = await import('./profile')
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null })

    const result = await updateCoupleSettings('emailNotifications', true)

    expect(result).toEqual({})
    expect(mockSupabase.rpc).toHaveBeenCalledWith('update_couple_setting', {
      p_couple_id: mockCoupleId,
      p_key: 'emailNotifications',
      p_value: true,
    })
  })
})

describe('exportUserData', () => {
  it('delegates to exportData', async () => {
    const { exportUserData } = await import('./profile')
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
