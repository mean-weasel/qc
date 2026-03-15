import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
const mockAdminClient = {
  from: vi.fn().mockReturnValue({ update: mockUpdate }),
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdminClient,
}))

vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: vi.fn().mockResolvedValue(true),
  })),
}))

const mockVerify = vi.fn()
vi.mock('svix', () => ({
  Webhook: class {
    verify = mockVerify
  },
}))

const { POST } = await import('./route')

function makeWebhookRequest(body: string, headers?: Record<string, string>): NextRequest {
  const h = new Headers({
    'svix-id': 'msg_123',
    'svix-timestamp': '1234567890',
    'svix-signature': 'v1_sig',
    ...headers,
  })
  return new NextRequest('http://localhost/api/email/webhook', {
    method: 'POST',
    headers: h,
    body,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('RESEND_WEBHOOK_SECRET', 'whsec_test')
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
})

describe('POST /api/email/webhook - security', () => {
  it('returns 401 when webhook secret not configured', async () => {
    vi.stubEnv('RESEND_WEBHOOK_SECRET', '')
    const res = await POST(makeWebhookRequest('{}'))
    expect(res.status).toBe(401)
  })

  it('returns 401 when signature headers missing', async () => {
    const req = new NextRequest('http://localhost/api/email/webhook', {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when signature verification fails', async () => {
    mockVerify.mockImplementation(() => {
      throw new Error('invalid')
    })
    const res = await POST(makeWebhookRequest('{}'))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/email/webhook - events', () => {
  it('returns received: true for delivered event', async () => {
    mockVerify.mockReturnValue({
      type: 'email.delivered',
      data: { email_id: 'e1', to: ['test@test.com'], created_at: '2025-01-01' },
    })
    const res = await POST(makeWebhookRequest('{}'))
    const data = await res.json()
    expect(data).toEqual({ received: true })
  })

  it('updates profile on bounce event', async () => {
    mockVerify.mockReturnValue({
      type: 'email.bounced',
      data: { email_id: 'e1', to: ['bounced@test.com'], created_at: '2025-01-01' },
    })
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEq })
    const res = await POST(makeWebhookRequest('{}'))
    const data = await res.json()
    expect(data).toEqual({ received: true })
    expect(mockAdminClient.from).toHaveBeenCalledWith('profiles')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ email_bounced_at: expect.any(String) }))
  })

  it('updates profile on complaint event', async () => {
    mockVerify.mockReturnValue({
      type: 'email.complained',
      data: { email_id: 'e1', to: ['spam@test.com'], created_at: '2025-01-01' },
    })
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEq })
    const res = await POST(makeWebhookRequest('{}'))
    const data = await res.json()
    expect(data).toEqual({ received: true })
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ email_complained_at: expect.any(String) }))
  })
})
