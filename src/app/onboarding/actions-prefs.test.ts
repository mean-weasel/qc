import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockUser = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }
const mockCoupleId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const mockInviteToken = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

let mockSupabase: ReturnType<typeof createMockSupabaseClient>

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/couples', () => ({
  createCouple: vi.fn(),
  createInvite: vi.fn(),
}))
vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
  shouldSendEmail: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/lib/email/templates/invite', () => ({
  InviteEmail: vi.fn().mockReturnValue(null),
}))
vi.mock('@/lib/email/templates/welcome', () => ({
  WelcomeEmail: vi.fn().mockReturnValue(null),
}))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({
    check: vi.fn().mockResolvedValue(true),
  }),
}))
class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT:${url}`)
  }
}

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new RedirectError(url)
  }),
}))

beforeEach(async () => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabaseClient()

  const { requireAuth } = await import('@/lib/auth')
  ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: mockUser,
    supabase: mockSupabase,
  })

  const { createClient } = await import('@/lib/supabase/server')
  ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
})

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.append(k, v)
  return fd
}

function setupHappyPath() {
  mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
  mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({ data: null, error: null })
  mockSupabase._queryBuilder.insert = vi.fn().mockReturnValue({ data: null, error: null })
}

async function setupMocks() {
  const { createCouple, createInvite } = await import('@/lib/couples')
  const { sendEmail } = await import('@/lib/email/send')
  ;(createCouple as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { id: mockCoupleId },
    error: null,
  })
  ;(createInvite as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { token: mockInviteToken },
    error: null,
  })
  ;(sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'email-1' }, error: null })
}

describe('completeOnboarding - preferences and reminders', () => {
  it('saves quiz preferences to couples.settings', async () => {
    const { completeOnboarding } = await import('./actions')
    setupHappyPath()
    await setupMocks()

    const prefs = JSON.stringify({
      communicationStyle: 'face-to-face',
      checkInFrequency: 'weekly',
      sessionStyle: 'standard',
    })
    const fd = makeFormData({
      displayName: 'Jeremy',
      partnerEmail: 'partner@example.com',
      preferences: prefs,
    })

    await expect(completeOnboarding({ error: null }, fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')

    const updateCalls = mockSupabase._queryBuilder.update.mock.calls
    const settingsCall = updateCalls.find(
      (call: unknown[]) =>
        call[0] &&
        typeof call[0] === 'object' &&
        'settings' in (call[0] as Record<string, unknown>) &&
        (call[0] as Record<string, unknown>).settings,
    )
    expect(settingsCall).toBeDefined()
    expect((settingsCall![0] as Record<string, unknown>).settings).toEqual({
      communicationStyle: 'face-to-face',
      checkInFrequency: 'weekly',
      sessionStyle: 'standard',
    })
  })

  it('creates a weekly reminder when day and time provided', async () => {
    const { completeOnboarding } = await import('./actions')
    setupHappyPath()
    await setupMocks()

    const fd = makeFormData({
      displayName: 'Jeremy',
      partnerEmail: 'partner@example.com',
      reminderDay: 'wednesday',
      reminderTime: '18:00',
    })

    await expect(completeOnboarding({ error: null }, fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')

    const insertCalls = mockSupabase._queryBuilder.insert.mock.calls
    const reminderCall = insertCalls.find(
      (call: unknown[]) =>
        call[0] && typeof call[0] === 'object' && 'frequency' in (call[0] as Record<string, unknown>),
    )
    expect(reminderCall).toBeDefined()
    const reminderData = reminderCall![0] as Record<string, unknown>
    expect(reminderData.couple_id).toBe(mockCoupleId)
    expect(reminderData.created_by).toBe(mockUser.id)
    expect(reminderData.frequency).toBe('weekly')
    expect(reminderData.category).toBe('check-in')
    expect(reminderData.is_active).toBe(true)
    expect((reminderData.custom_schedule as Record<string, unknown>).dayOfWeek).toBe('wednesday')
    expect((reminderData.custom_schedule as Record<string, unknown>).time).toBe('18:00')
  })

  it('completes onboarding without preferences or reminder (optional fields)', async () => {
    const { completeOnboarding } = await import('./actions')
    const { redirect } = await import('next/navigation')
    setupHappyPath()
    await setupMocks()

    const fd = makeFormData({
      displayName: 'Jeremy',
      partnerEmail: 'partner@example.com',
    })

    await expect(completeOnboarding({ error: null }, fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })

  it('does not crash on malformed preferences JSON (non-blocking)', async () => {
    const { completeOnboarding } = await import('./actions')
    const { redirect } = await import('next/navigation')
    setupHappyPath()
    await setupMocks()

    const fd = makeFormData({
      displayName: 'Jeremy',
      partnerEmail: 'partner@example.com',
      preferences: '{not valid json!!!',
    })

    await expect(completeOnboarding({ error: null }, fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })

  it('does not crash on incomplete preferences (missing fields)', async () => {
    const { completeOnboarding } = await import('./actions')
    const { redirect } = await import('next/navigation')
    setupHappyPath()
    await setupMocks()

    const fd = makeFormData({
      displayName: 'Jeremy',
      partnerEmail: 'partner@example.com',
      preferences: JSON.stringify({ communicationStyle: 'mix' }),
    })

    await expect(completeOnboarding({ error: null }, fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })
})
