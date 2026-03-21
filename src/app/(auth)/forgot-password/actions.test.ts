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
  mockSupabase.auth.resetPasswordForEmail = vi.fn().mockResolvedValue({ data: {}, error: null })
  mockRateLimitCheck = vi.fn().mockResolvedValue(true)

  const { createClient } = await import('@/lib/supabase/server')
  ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
})

describe('requestPasswordReset', () => {
  it('returns error for invalid email', async () => {
    const { requestPasswordReset } = await import('./actions')

    const result = await requestPasswordReset({ email: 'not-an-email' })

    expect(result.error).toBe('Please enter a valid email address')
  })

  it('returns error when rate limited', async () => {
    mockRateLimitCheck.mockResolvedValue(false)

    const { requestPasswordReset } = await import('./actions')

    const result = await requestPasswordReset({ email: 'test@example.com' })

    expect(result.error).toBe('Too many requests. Please try again later.')
    expect(mockSupabase.auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('returns null error on success even when Supabase errors (no enumeration)', async () => {
    mockSupabase.auth.resetPasswordForEmail = vi.fn().mockResolvedValue({
      data: {},
      error: { message: 'User not found' },
    })

    const { requestPasswordReset } = await import('./actions')

    const result = await requestPasswordReset({ email: 'nonexistent@example.com' })

    expect(result.error).toBeNull()
  })

  it('calls resetPasswordForEmail with correct redirectTo', async () => {
    const { requestPasswordReset } = await import('./actions')

    await requestPasswordReset({ email: 'test@example.com' })

    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
      redirectTo: 'http://localhost:3000/reset-password',
    })
  })

  it('passes correct rate limit key with IP', async () => {
    const { requestPasswordReset } = await import('./actions')

    await requestPasswordReset({ email: 'test@example.com' })

    expect(mockRateLimitCheck).toHaveBeenCalledWith('forgot-password:127.0.0.1')
  })
})
