import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockFrom = vi.fn()
const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null })
const mockAdminClient = { from: mockFrom, rpc: mockRpc }

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdminClient,
}))

const mockSendEmail = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/lib/email/send', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

vi.mock('@/lib/email/templates/reminder', () => ({
  ReminderEmail: vi.fn().mockReturnValue('mock-email-jsx'),
}))

const { GET } = await import('./route')

function makeRequest(authHeader?: string): NextRequest {
  const headers = new Headers()
  if (authHeader) headers.set('authorization', authHeader)
  return new NextRequest('http://localhost/api/cron/send-reminders', { headers })
}

function remindersChain(data: unknown[] = [], error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data, error }),
          }),
        }),
      }),
    }),
  }
}

function profilesChain(data: unknown[]) {
  return {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data }),
    }),
  }
}

function deactivateChain() {
  return {
    update: vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }
}

const mockReminder = {
  id: 'r1',
  couple_id: 'c1',
  created_by: 'u1',
  title: 'Test',
  message: 'Do it',
  notification_channel: 'email',
}

const goodProfile = {
  id: 'u1',
  email: 'test@example.com',
  email_unsubscribe_token: 'tok',
  email_bounced_at: null,
  email_complained_at: null,
  email_opted_out_at: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', 'test-secret')
})

describe('GET /api/cron/send-reminders - auth', () => {
  it('returns 401 when no auth header', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when wrong secret', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns 401 when CRON_SECRET is unset', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(401)
  })
})

describe('GET /api/cron/send-reminders - queries', () => {
  it('returns sent: 0 when no reminders due', async () => {
    mockFrom.mockReturnValue(remindersChain())
    const res = await GET(makeRequest('Bearer test-secret'))
    const data = await res.json()
    expect(data.sent).toBe(0)
  })

  it('returns 500 on DB query error', async () => {
    mockFrom.mockReturnValue(remindersChain([], { message: 'DB fail' }))
    const res = await GET(makeRequest('Bearer test-secret'))
    expect(res.status).toBe(500)
  })
})

describe('GET /api/cron/send-reminders - email', () => {
  it('sends email and returns sent count', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return remindersChain([mockReminder])
      if (callCount === 2) return profilesChain([goodProfile])
      return deactivateChain()
    })
    const res = await GET(makeRequest('Bearer test-secret'))
    const data = await res.json()
    expect(data.sent).toBe(1)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
  })

  it('skips bounced profiles', async () => {
    const bouncedProfile = { ...goodProfile, email_bounced_at: '2025-01-01' }
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      return callCount === 1 ? remindersChain([{ ...mockReminder, message: null }]) : profilesChain([bouncedProfile])
    })
    const res = await GET(makeRequest('Bearer test-secret'))
    const data = await res.json()
    expect(data.sent).toBe(0)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})
