import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockUser = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'user@example.com',
}

let mockSupabase: ReturnType<typeof createMockSupabaseClient>

const mockAdminDeleteUser = vi.fn().mockResolvedValue({ error: null })

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    auth: {
      admin: {
        deleteUser: mockAdminDeleteUser,
      },
    },
  }),
}))

const mockRateLimitCheck = vi.fn().mockResolvedValue(true)
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn().mockReturnValue({
    check: mockRateLimitCheck,
  }),
}))

beforeEach(async () => {
  vi.clearAllMocks()
  mockAdminDeleteUser.mockResolvedValue({ error: null })
  mockRateLimitCheck.mockResolvedValue(true)

  mockSupabase = createMockSupabaseClient()
  mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
    data: { user: mockUser, session: {} },
    error: null,
  })
  mockSupabase.auth.signOut = vi.fn().mockResolvedValue({ error: null })

  const { requireAuth } = await import('@/lib/auth')
  ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: mockUser,
    supabase: mockSupabase,
  })
})

describe('deleteAccount', () => {
  it('returns error when password is empty', async () => {
    const { deleteAccount } = await import('./delete-account-actions')

    const result = await deleteAccount({ password: '' })

    expect(result.error).toBeTruthy()
    expect(result.error).toContain('Password is required')
  })

  it('returns error when rate limited', async () => {
    const { deleteAccount } = await import('./delete-account-actions')
    mockRateLimitCheck.mockResolvedValueOnce(false)

    const result = await deleteAccount({ password: 'secret123' })

    expect(result.error).toBe('Too many attempts. Please try again later.')
  })

  it('returns error when password is wrong', async () => {
    const { deleteAccount } = await import('./delete-account-actions')
    mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    })

    const result = await deleteAccount({ password: 'wrongpassword' })

    expect(result.error).toBe('Incorrect password. Please try again.')
  })

  it('calls admin.deleteUser and signs out on success', async () => {
    const { deleteAccount } = await import('./delete-account-actions')

    const result = await deleteAccount({ password: 'correctpassword' })

    expect(result.error).toBeNull()
    expect(mockAdminDeleteUser).toHaveBeenCalledWith(mockUser.id)
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('returns error when admin deleteUser fails', async () => {
    const { deleteAccount } = await import('./delete-account-actions')
    mockAdminDeleteUser.mockResolvedValueOnce({ error: { message: 'User not found' } })

    const result = await deleteAccount({ password: 'correctpassword' })

    expect(result.error).toBe('Failed to delete account. Please try again.')
    expect(mockSupabase.auth.signOut).not.toHaveBeenCalled()
  })
})
