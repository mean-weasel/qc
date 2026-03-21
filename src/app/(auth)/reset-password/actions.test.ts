import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

let mockSupabase: ReturnType<typeof createMockSupabaseClient>
let mockRateLimitCheck: ReturnType<typeof vi.fn<(key: string) => Promise<boolean>>>

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(
    new Map([
      ['x-real-ip', '127.0.0.1'],
      ['x-forwarded-for', '127.0.0.1'],
    ]),
  ),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: (key: string) => mockRateLimitCheck(key),
  })),
}))

beforeEach(async () => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabaseClient()
  mockSupabase.auth.updateUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockRateLimitCheck = vi.fn().mockResolvedValue(true)

  const { createClient } = await import('@/lib/supabase/server')
  ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
})

describe('updatePassword', () => {
  it('returns error for short password', async () => {
    const { updatePassword } = await import('./actions')

    const result = await updatePassword({ password: 'short' })

    expect(result.error).toBe('Password must be at least 8 characters')
  })

  it('returns error when rate limited', async () => {
    mockRateLimitCheck.mockResolvedValue(false)

    const { updatePassword } = await import('./actions')

    const result = await updatePassword({ password: 'validpassword123' })

    expect(result.error).toBe('Too many requests. Please try again later.')
    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('forwards Supabase error on failure', async () => {
    mockSupabase.auth.updateUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Session expired' },
    })

    const { updatePassword } = await import('./actions')

    const result = await updatePassword({ password: 'validpassword123' })

    expect(result.error).toBe('Session expired')
  })

  it('returns null error on success', async () => {
    const { updatePassword } = await import('./actions')

    const result = await updatePassword({ password: 'validpassword123' })

    expect(result.error).toBeNull()
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'validpassword123' })
  })

  it('passes correct rate limit key with IP', async () => {
    const { updatePassword } = await import('./actions')

    await updatePassword({ password: 'validpassword123' })

    expect(mockRateLimitCheck).toHaveBeenCalledWith('reset-password:127.0.0.1')
  })
})
