import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockSupabase = createMockSupabaseClient()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockSupabase),
}))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: vi.fn().mockResolvedValue(true),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com'
})

function callGET(token: string): Promise<Response> {
  // Re-import to pick up mocks each time
  return import('./route').then(({ GET }) => {
    const req = new NextRequest(`http://localhost/api/email/unsubscribe/${token}`)
    return GET(req, { params: Promise.resolve({ token }) })
  })
}

describe('GET /api/email/unsubscribe/[token]', () => {
  it('returns 400 for invalid token (too short)', async () => {
    const res = await callGET('short')
    const html = await res.text()

    expect(res.status).toBe(400)
    expect(html).toContain('Invalid unsubscribe link')
    expect(html).toContain('Error')
  })

  it('returns 400 for empty token', async () => {
    const res = await callGET('')
    const html = await res.text()

    expect(res.status).toBe(400)
    expect(html).toContain('Invalid unsubscribe link')
  })

  it('returns 404 when token is not found in database', async () => {
    mockSupabase._queryBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const res = await callGET('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    const html = await res.text()

    expect(res.status).toBe(404)
    expect(html).toContain('Unsubscribe link not found')
    expect(mockSupabase._queryBuilder.eq).toHaveBeenCalledWith(
      'email_unsubscribe_token',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    )
  })

  it('returns 200 when user is already unsubscribed', async () => {
    mockSupabase._queryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'user-123', email_opted_out_at: '2025-01-01T00:00:00Z' },
      error: null,
    })

    const res = await callGET('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(html).toContain('already unsubscribed')
    expect(html).toContain('Unsubscribed')
    expect(mockSupabase._queryBuilder.update).not.toHaveBeenCalled()
  })

  it('sets email_opted_out_at and returns success', async () => {
    mockSupabase._queryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'user-123', email_opted_out_at: null },
      error: null,
    })
    // The update().eq() chain: eq returns the queryBuilder by default (no error property = success)

    const res = await callGET('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(html).toContain('unsubscribed from QC emails')
    expect(mockSupabase._queryBuilder.update).toHaveBeenCalledWith({
      email_opted_out_at: expect.any(String),
    })
  })

  it('returns 500 on DB update error', async () => {
    mockSupabase._queryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'user-123', email_opted_out_at: null },
      error: null,
    })
    const qb = mockSupabase._queryBuilder
    // First eq call (select chain) returns self for chaining; second eq call (update chain) returns error
    qb.eq.mockReturnValueOnce(qb).mockResolvedValueOnce({ error: { message: 'DB fail' } })

    const res = await callGET('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    const html = await res.text()

    expect(res.status).toBe(500)
    expect(html).toContain('Something went wrong')
  })
})
