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
}))
vi.mock('@/lib/email/templates/invite', () => ({
  InviteEmail: vi.fn().mockReturnValue(null),
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

function setupHappyPathMocks() {
  mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
  mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({ data: null, error: null })
}

describe('completeOnboarding - love languages', () => {
  it('saves selected love languages when provided', async () => {
    const { completeOnboarding } = await import('./actions')
    const { createCouple, createInvite } = await import('@/lib/couples')
    const { sendEmail } = await import('@/lib/email/send')

    setupHappyPathMocks()
    ;(createCouple as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: mockCoupleId },
      error: null,
    })
    ;(createInvite as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { token: mockInviteToken },
      error: null,
    })
    ;(sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const fd = makeFormData({
      displayName: 'Jeremy',
      partnerEmail: 'partner@example.com',
      selectedLanguages: JSON.stringify(['words', 'time']),
    })

    await expect(completeOnboarding({ error: null }, fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')

    // Verify love_languages insert was called
    expect(mockSupabase.from).toHaveBeenCalledWith('love_languages')
    expect(mockSupabase._queryBuilder.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ category: 'words', title: 'Words of Affirmation' }),
        expect.objectContaining({ category: 'time', title: 'Quality Time' }),
      ]),
    )
  })

  it('completes onboarding without love languages when none selected', async () => {
    const { completeOnboarding } = await import('./actions')
    const { createCouple, createInvite } = await import('@/lib/couples')
    const { sendEmail } = await import('@/lib/email/send')
    const { redirect } = await import('next/navigation')

    setupHappyPathMocks()
    ;(createCouple as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: mockCoupleId },
      error: null,
    })
    ;(createInvite as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { token: mockInviteToken },
      error: null,
    })
    ;(sendEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 'email-1' }, error: null })

    const fd = makeFormData({
      displayName: 'Jeremy',
      partnerEmail: 'partner@example.com',
      selectedLanguages: JSON.stringify([]),
    })

    await expect(completeOnboarding({ error: null }, fd)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })
})
