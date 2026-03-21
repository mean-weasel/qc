import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (must be hoisted before any imports that trigger module evaluation) ─

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(
    new Map([
      ['x-real-ip', '10.0.0.1'],
      ['x-forwarded-for', '10.0.0.1'],
    ]),
  ),
}))

const mockRateLimitCheck = vi.fn().mockResolvedValue(true)
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: (key: string) => mockRateLimitCheck(key),
  })),
}))

const mockFrom = vi.fn()
const mockAdminClient = { from: mockFrom }
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdminClient,
}))

const mockSendWaitlistConfirmation = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null })
vi.mock('@/lib/email/send', () => ({
  sendWaitlistConfirmation: (...args: unknown[]) => mockSendWaitlistConfirmation(...args),
}))

const mockContactsCreate = vi.fn().mockResolvedValue({ data: { id: 'contact-1' }, error: null })
vi.mock('@/lib/email/resend', () => ({
  getResend: () => ({
    contacts: { create: (...args: unknown[]) => mockContactsCreate(...args) },
  }),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.append(k, v)
  return fd
}

/** Build a chainable Supabase mock for a single table call sequence. */
function makeQueryChain(
  overrides: {
    maybeSingleResult?: { data: unknown; error: unknown }
    insertResult?: { error: unknown }
  } = {},
) {
  const resolvedMaybeSingle = vi.fn().mockResolvedValue(overrides.maybeSingleResult ?? { data: null, error: null })
  const insertImpl = vi.fn().mockResolvedValue(overrides.insertResult ?? { error: null })
  const selectChain = {
    eq: vi.fn().mockReturnValue({ maybeSingle: resolvedMaybeSingle }),
  }

  return {
    select: vi.fn().mockReturnValue(selectChain),
    insert: insertImpl,
    _selectChain: selectChain,
    _maybeSingle: resolvedMaybeSingle,
    _insert: insertImpl,
  }
}

// ── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimitCheck.mockResolvedValue(true)
  mockSendWaitlistConfirmation.mockResolvedValue({ data: { id: 'email-1' }, error: null })
  mockContactsCreate.mockResolvedValue({ data: { id: 'contact-1' }, error: null })
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('joinWaitlist', () => {
  it('returns error for invalid email format', async () => {
    const { joinWaitlist } = await import('./actions')

    const result = await joinWaitlist(makeFormData({ email: 'not-an-email' }))

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid email address')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns error when rate limited', async () => {
    mockRateLimitCheck.mockResolvedValue(false)

    const { joinWaitlist } = await import('./actions')

    const result = await joinWaitlist(makeFormData({ email: 'user@example.com' }))

    expect(result.success).toBe(false)
    expect(result.error).toBe('Too many attempts. Please try again later.')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('uses correct rate limit key with IP', async () => {
    const chain = makeQueryChain()
    mockFrom.mockReturnValue(chain)

    const { joinWaitlist } = await import('./actions')

    await joinWaitlist(makeFormData({ email: 'user@example.com' }))

    expect(mockRateLimitCheck).toHaveBeenCalledWith('waitlist:10.0.0.1')
  })

  it('returns success silently for duplicate email (no info leak)', async () => {
    const chain = makeQueryChain({ maybeSingleResult: { data: { id: 'existing-id' }, error: null } })
    mockFrom.mockReturnValue(chain)

    const { joinWaitlist } = await import('./actions')

    const result = await joinWaitlist(makeFormData({ email: 'existing@example.com' }))

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    // Should not attempt a second insert
    expect(chain._insert).not.toHaveBeenCalled()
  })

  it('inserts new waitlist entry and returns success on happy path', async () => {
    const chain = makeQueryChain()
    mockFrom.mockReturnValue(chain)

    const { joinWaitlist } = await import('./actions')

    const result = await joinWaitlist(makeFormData({ email: 'new@example.com', name: 'Alice', source: 'landing' }))

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    expect(chain._insert).toHaveBeenCalledWith({ email: 'new@example.com', name: 'Alice', source: 'landing' })
  })

  it('returns error when DB insert fails', async () => {
    const chain = makeQueryChain({ insertResult: { error: { message: 'unique_violation' } } })
    mockFrom.mockReturnValue(chain)

    const { joinWaitlist } = await import('./actions')

    const result = await joinWaitlist(makeFormData({ email: 'fail@example.com' }))

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to join waitlist. Please try again.')
  })

  it('still returns success when Resend audience add throws (non-blocking)', async () => {
    const chain = makeQueryChain()
    mockFrom.mockReturnValue(chain)
    mockContactsCreate.mockRejectedValue(new Error('Resend API unavailable'))

    // Set an audience ID so the contacts.create path is exercised
    const originalAudienceId = process.env.RESEND_WAITLIST_AUDIENCE_ID
    process.env.RESEND_WAITLIST_AUDIENCE_ID = 'aud_test_123'

    const { joinWaitlist } = await import('./actions')

    const result = await joinWaitlist(makeFormData({ email: 'new@example.com' }))

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()

    process.env.RESEND_WAITLIST_AUDIENCE_ID = originalAudienceId
  })

  it('still returns success when confirmation email send fails (non-blocking)', async () => {
    const chain = makeQueryChain()
    mockFrom.mockReturnValue(chain)
    mockSendWaitlistConfirmation.mockRejectedValue(new Error('RESEND_API_KEY not configured'))

    const { joinWaitlist } = await import('./actions')

    const result = await joinWaitlist(makeFormData({ email: 'new@example.com' }))

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('sends confirmation email with correct email and name', async () => {
    const chain = makeQueryChain()
    mockFrom.mockReturnValue(chain)

    const { joinWaitlist } = await import('./actions')

    await joinWaitlist(makeFormData({ email: 'alice@example.com', name: 'Alice' }))

    expect(mockSendWaitlistConfirmation).toHaveBeenCalledWith('alice@example.com', 'Alice')
  })

  it('queries waitlist table for duplicate check before inserting', async () => {
    const chain = makeQueryChain()
    mockFrom.mockReturnValue(chain)

    const { joinWaitlist } = await import('./actions')

    await joinWaitlist(makeFormData({ email: 'new@example.com' }))

    expect(mockFrom).toHaveBeenCalledWith('waitlist')
    expect(chain.select).toHaveBeenCalledWith('id')
    expect(chain._selectChain.eq).toHaveBeenCalledWith('email', 'new@example.com')
  })
})
