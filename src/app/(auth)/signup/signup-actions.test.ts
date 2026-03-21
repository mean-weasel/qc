import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

let mockSupabase: ReturnType<typeof createMockSupabaseClient>
let mockRateLimitCheck: ReturnType<typeof vi.fn<(key: string) => Promise<boolean>>>

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(
    new Map([
      ['x-real-ip', '192.168.1.1'],
      ['x-forwarded-for', '192.168.1.1'],
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

describe('signupWithPassword', () => {
  it('returns error for invalid email', async () => {
    const { signupWithPassword } = await import('./signup-actions')

    const result = await signupWithPassword({
      displayName: 'Test',
      email: 'not-an-email',
      password: 'password123',
    })

    expect(result.error).toBe('Invalid email address')
  })

  it('returns error for empty display name', async () => {
    const { signupWithPassword } = await import('./signup-actions')

    const result = await signupWithPassword({
      displayName: '',
      email: 'test@example.com',
      password: 'password123',
    })

    expect(result.error).toBe('Display name is required')
  })

  it('returns error for short password', async () => {
    const { signupWithPassword } = await import('./signup-actions')

    const result = await signupWithPassword({
      displayName: 'Test',
      email: 'test@example.com',
      password: 'short',
    })

    expect(result.error).toBe('Password must be at least 8 characters')
  })

  it('returns error when rate limited', async () => {
    mockRateLimitCheck.mockResolvedValue(false)

    const { signupWithPassword } = await import('./signup-actions')

    const result = await signupWithPassword({
      displayName: 'Test',
      email: 'test@example.com',
      password: 'password123',
    })

    expect(result.error).toBe('Too many signup attempts. Please try again later.')
    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('forwards Supabase auth error', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    })

    const { signupWithPassword } = await import('./signup-actions')

    const result = await signupWithPassword({
      displayName: 'Test',
      email: 'test@example.com',
      password: 'password123',
    })

    expect(result.error).toBe('User already registered')
  })

  it('returns null error on successful signup', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1' }, session: {} },
      error: null,
    })

    const { signupWithPassword } = await import('./signup-actions')

    const result = await signupWithPassword({
      displayName: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    })

    expect(result.error).toBeNull()
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: {
          display_name: 'Test User',
        },
      },
    })
  })

  it('passes correct rate limit key with IP', async () => {
    const { signupWithPassword } = await import('./signup-actions')

    await signupWithPassword({
      displayName: 'Test',
      email: 'test@example.com',
      password: 'password123',
    })

    expect(mockRateLimitCheck).toHaveBeenCalledWith('signup:192.168.1.1')
  })
})
