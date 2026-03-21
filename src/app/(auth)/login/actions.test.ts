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
  mockRateLimitCheck = vi.fn().mockResolvedValue(true)

  const { createClient } = await import('@/lib/supabase/server')
  ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
})

describe('loginWithPassword', () => {
  it('returns error for invalid email', async () => {
    const { loginWithPassword } = await import('./actions')

    const result = await loginWithPassword({ email: 'not-an-email', password: 'password123' })

    expect(result.error).toBe('Invalid email address')
  })

  it('returns error for empty password', async () => {
    const { loginWithPassword } = await import('./actions')

    const result = await loginWithPassword({ email: 'test@example.com', password: '' })

    expect(result.error).toBe('Password is required')
  })

  it('returns error when rate limited', async () => {
    mockRateLimitCheck.mockResolvedValue(false)

    const { loginWithPassword } = await import('./actions')

    const result = await loginWithPassword({ email: 'test@example.com', password: 'password123' })

    expect(result.error).toBe('Too many login attempts. Please try again in a few minutes.')
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('forwards Supabase auth error', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    })

    const { loginWithPassword } = await import('./actions')

    const result = await loginWithPassword({ email: 'test@example.com', password: 'wrongpassword' })

    expect(result.error).toBe('Invalid login credentials')
  })

  it('returns null error on successful login', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' }, session: {} },
      error: null,
    })

    const { loginWithPassword } = await import('./actions')

    const result = await loginWithPassword({ email: 'test@example.com', password: 'correctpassword' })

    expect(result.error).toBeNull()
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'correctpassword',
    })
  })

  it('passes correct rate limit key with IP', async () => {
    const { loginWithPassword } = await import('./actions')

    await loginWithPassword({ email: 'test@example.com', password: 'password123' })

    expect(mockRateLimitCheck).toHaveBeenCalledWith('login:127.0.0.1')
  })
})
