import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createRateLimiter', () => {
  it('allows requests when rpc returns true', async () => {
    const { createRateLimiter } = await import('./rate-limit')
    mockRpc.mockResolvedValue({ data: true, error: null })

    const limiter = createRateLimiter({ maxRequests: 5, windowSeconds: 60 })
    const result = await limiter.check('test-key')

    expect(result).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('check_rate_limit', {
      p_key: 'test-key',
      p_max_requests: 5,
      p_window_seconds: 60,
    })
  })

  it('blocks requests when rpc returns false', async () => {
    const { createRateLimiter } = await import('./rate-limit')
    mockRpc.mockResolvedValue({ data: false, error: null })

    const limiter = createRateLimiter({ maxRequests: 3, windowSeconds: 60 })
    const result = await limiter.check('test-key')

    expect(result).toBe(false)
  })

  it('fails open by default when rpc errors', async () => {
    const { createRateLimiter } = await import('./rate-limit')
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const limiter = createRateLimiter({ maxRequests: 5, windowSeconds: 60 })
    const result = await limiter.check('test-key')

    expect(result).toBe(true)
  })

  it('fails closed when configured and rpc errors', async () => {
    const { createRateLimiter } = await import('./rate-limit')
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const limiter = createRateLimiter({ maxRequests: 5, windowSeconds: 60, failClosed: true })
    const result = await limiter.check('test-key')

    expect(result).toBe(false)
  })
})
