import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockCheckInId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const mockCoupleId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

let mockSupabase: ReturnType<typeof createMockSupabaseClient>

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))
vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
  shouldSendEmail: vi.fn(),
}))
vi.mock('@/lib/email/templates/checkin-summary', () => ({
  CheckInSummaryEmail: vi.fn().mockReturnValue(null),
}))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: vi.fn().mockResolvedValue(true),
  })),
}))

beforeEach(async () => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabaseClient()

  const { requireAuth } = await import('@/lib/auth')
  ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    supabase: mockSupabase,
  })
})

/**
 * Helper that configures mockSupabase.from to return different query builders
 * for different table names. Each builder resolves its terminal call with the
 * provided data/error.
 */
function setupFromMock(tableResponses: Record<string, { data: unknown; error: unknown; terminal?: 'single' }>) {
  mockSupabase.from = vi.fn().mockImplementation((table: string) => {
    const response = tableResponses[table] ?? { data: null, error: null }
    const builder: Record<string, ReturnType<typeof vi.fn>> = {}
    const methods = ['select', 'eq', 'insert', 'update', 'delete', 'order', 'limit']
    for (const method of methods) {
      builder[method] = vi.fn().mockReturnValue(builder)
    }
    if (response.terminal === 'single') {
      builder['single'] = vi.fn().mockResolvedValue({ data: response.data, error: response.error })
    } else {
      // Non-single: resolve on the last .eq() call (or .select() if no .eq())
      const resolvedValue = { data: response.data, error: response.error }
      builder['eq'] = vi.fn().mockReturnValue(resolvedValue)
      builder['select'] = vi.fn().mockReturnValue({ ...builder, eq: builder['eq'] })
    }
    return builder
  })
}

describe('checkCheckInRateLimit', () => {
  it('returns allowed: true when under the limit', async () => {
    const { checkCheckInRateLimit } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })

    const result = await checkCheckInRateLimit()

    expect(result).toEqual({ allowed: true })
  })

  it('returns allowed: false when no couple', async () => {
    const { checkCheckInRateLimit } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: null },
      error: null,
    })

    const result = await checkCheckInRateLimit()

    expect(result.allowed).toBe(false)
    expect(result.error).toBeTruthy()
  })
})

describe('sendCheckInSummaryEmail', () => {
  it('sends email to both partners', async () => {
    const { sendCheckInSummaryEmail } = await import('./actions')
    const { sendEmail, shouldSendEmail } = await import('@/lib/email/send')
    ;(shouldSendEmail as ReturnType<typeof vi.fn>).mockResolvedValue(true)
    ;(sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'email-1' }, error: null })

    setupFromMock({
      check_ins: {
        data: { couple_id: mockCoupleId, categories: ['emotional'], mood_before: 3, mood_after: 5 },
        error: null,
        terminal: 'single',
      },
      profiles: {
        data: [
          { id: 'user-1', email: 'alice@example.com', display_name: 'Alice' },
          { id: 'user-2', email: 'bob@example.com', display_name: 'Bob' },
        ],
        error: null,
      },
      action_items: {
        data: [{ id: 'ai-1' }],
        error: null,
      },
    })

    await sendCheckInSummaryEmail(mockCheckInId)

    expect(sendEmail).toHaveBeenCalledTimes(2)
    expect(shouldSendEmail).toHaveBeenCalledTimes(2)
    expect(shouldSendEmail).toHaveBeenCalledWith('alice@example.com')
    expect(shouldSendEmail).toHaveBeenCalledWith('bob@example.com')
  })

  it('skips partner whose email has bounced', async () => {
    const { sendCheckInSummaryEmail } = await import('./actions')
    const { sendEmail, shouldSendEmail } = await import('@/lib/email/send')
    ;(shouldSendEmail as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(true) // alice can receive
      .mockResolvedValueOnce(false) // bob bounced
    ;(sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'email-1' }, error: null })

    setupFromMock({
      check_ins: {
        data: { couple_id: mockCoupleId, categories: [], mood_before: 4, mood_after: 4 },
        error: null,
        terminal: 'single',
      },
      profiles: {
        data: [
          { id: 'user-1', email: 'alice@example.com', display_name: 'Alice' },
          { id: 'user-2', email: 'bob@example.com', display_name: 'Bob' },
        ],
        error: null,
      },
      action_items: {
        data: [],
        error: null,
      },
    })

    await sendCheckInSummaryEmail(mockCheckInId)

    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'alice@example.com' }))
  })

  it('does not throw when sendEmail fails', async () => {
    const { sendCheckInSummaryEmail } = await import('./actions')
    const { sendEmail, shouldSendEmail } = await import('@/lib/email/send')
    ;(shouldSendEmail as ReturnType<typeof vi.fn>).mockResolvedValue(true)
    ;(sendEmail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('RESEND_API_KEY not configured'))

    setupFromMock({
      check_ins: {
        data: { couple_id: mockCoupleId, categories: [], mood_before: 3, mood_after: 3 },
        error: null,
        terminal: 'single',
      },
      profiles: {
        data: [
          { id: 'user-1', email: 'alice@example.com', display_name: 'Alice' },
          { id: 'user-2', email: 'bob@example.com', display_name: 'Bob' },
        ],
        error: null,
      },
      action_items: {
        data: [],
        error: null,
      },
    })

    await expect(sendCheckInSummaryEmail(mockCheckInId)).resolves.toBeUndefined()
  })

  it('returns early when check-in not found', async () => {
    const { sendCheckInSummaryEmail } = await import('./actions')
    const { sendEmail } = await import('@/lib/email/send')

    setupFromMock({
      check_ins: {
        data: null,
        error: { message: 'Not found' },
        terminal: 'single',
      },
    })

    await sendCheckInSummaryEmail(mockCheckInId)

    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('returns early when profiles count is not 2', async () => {
    const { sendCheckInSummaryEmail } = await import('./actions')
    const { sendEmail } = await import('@/lib/email/send')

    setupFromMock({
      check_ins: {
        data: { couple_id: mockCoupleId, categories: [], mood_before: 3, mood_after: 3 },
        error: null,
        terminal: 'single',
      },
      profiles: {
        data: [{ id: 'user-1', email: 'alice@example.com', display_name: 'Alice' }],
        error: null,
      },
    })

    await sendCheckInSummaryEmail(mockCheckInId)

    expect(sendEmail).not.toHaveBeenCalled()
  })
})
