import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement } from 'react'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockSend = vi.fn()
const mockBatchSend = vi.fn()
const mockSupabase = createMockSupabaseClient()

vi.mock('./resend', () => ({
  getResend: vi.fn().mockReturnValue({
    emails: { send: mockSend },
    batch: { send: mockBatchSend },
  }),
  EMAIL_FROM: 'onboarding@resend.dev',
  BATCH_SIZE: 2,
}))

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
})

const mockReactElement = createElement('div', null, 'Hello')

describe('sendEmail', () => {
  it('sends an email successfully', async () => {
    const { sendEmail } = await import('./send')

    mockSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null })

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      react: mockReactElement,
    })

    expect(result).toEqual({ data: { id: 'email-1' }, error: null })
    expect(mockSend).toHaveBeenCalledWith({
      from: 'onboarding@resend.dev',
      to: 'test@example.com',
      subject: 'Test Subject',
      react: mockReactElement,
      headers: {
        'List-Unsubscribe': '<https://tryqc.co/api/email/unsubscribe?email=test%40example.com>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })
  })

  it('returns error when Resend API fails', async () => {
    const { sendEmail } = await import('./send')

    mockSend.mockResolvedValueOnce({ data: null, error: { message: 'Resend API error' } })

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      react: mockReactElement,
    })

    expect(result.error).toEqual({ message: 'Resend API error' })
  })

  it('sends email when coupleId provided and under limit', async () => {
    const { sendEmail } = await import('./send')

    mockSend.mockResolvedValueOnce({ data: { id: 'email-2' }, error: null })

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test with couple',
      react: mockReactElement,
      coupleId: 'couple-123',
    })

    expect(result).toEqual({ data: { id: 'email-2' }, error: null })
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})

describe('sendBatchEmails', () => {
  it('sends all emails successfully', async () => {
    const { sendBatchEmails } = await import('./send')

    mockBatchSend.mockResolvedValue({ data: {}, error: null })

    const result = await sendBatchEmails({
      recipients: ['a@test.com', 'b@test.com'],
      subject: 'Batch Test',
      react: mockReactElement,
    })

    expect(result).toEqual({ sent: 2, failed: 0, errors: [] })
  })

  it('handles partial batch failure', async () => {
    const { sendBatchEmails } = await import('./send')

    // BATCH_SIZE is mocked to 2, so 3 recipients = 2 batches
    mockBatchSend
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Batch failed' } })

    const result = await sendBatchEmails({
      recipients: ['a@test.com', 'b@test.com', 'c@test.com'],
      subject: 'Batch Test',
      react: mockReactElement,
    })

    expect(result.sent).toBe(2)
    expect(result.failed).toBe(1)
    expect(result.errors).toContain('Batch failed')
  })

  it('handles all batches failing', async () => {
    const { sendBatchEmails } = await import('./send')

    mockBatchSend.mockResolvedValue({ data: null, error: { message: 'All failed' } })

    const result = await sendBatchEmails({
      recipients: ['a@test.com', 'b@test.com'],
      subject: 'Batch Test',
      react: mockReactElement,
    })

    expect(result.sent).toBe(0)
    expect(result.failed).toBe(2)
    expect(result.errors).toContain('All failed')
  })
})

describe('shouldSendEmail', () => {
  it('returns true for a clean profile with no flags set', async () => {
    const { shouldSendEmail } = await import('./send')

    mockSupabase._queryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { email_bounced_at: null, email_complained_at: null, email_opted_out_at: null },
      error: null,
    })

    const result = await shouldSendEmail('clean@example.com')

    expect(result).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
  })

  it('returns false when profile has bounced', async () => {
    const { shouldSendEmail } = await import('./send')

    mockSupabase._queryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { email_bounced_at: '2025-01-15T00:00:00Z', email_complained_at: null, email_opted_out_at: null },
      error: null,
    })

    const result = await shouldSendEmail('bounced@example.com')

    expect(result).toBe(false)
  })

  it('returns false when profile has complained', async () => {
    const { shouldSendEmail } = await import('./send')

    mockSupabase._queryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { email_bounced_at: null, email_complained_at: '2025-02-01T00:00:00Z', email_opted_out_at: null },
      error: null,
    })

    const result = await shouldSendEmail('complainer@example.com')

    expect(result).toBe(false)
  })

  it('returns false when profile has opted out', async () => {
    const { shouldSendEmail } = await import('./send')

    mockSupabase._queryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { email_bounced_at: null, email_complained_at: null, email_opted_out_at: '2025-03-10T00:00:00Z' },
      error: null,
    })

    const result = await shouldSendEmail('optout@example.com')

    expect(result).toBe(false)
  })

  it('returns true when profile is not found (unknown email)', async () => {
    const { shouldSendEmail } = await import('./send')

    mockSupabase._queryBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const result = await shouldSendEmail('unknown@example.com')

    expect(result).toBe(true)
  })
})
