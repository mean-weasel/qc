import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockUser = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }
const mockCoupleId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const mockReminderId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

let mockSupabase: ReturnType<typeof createMockSupabaseClient>

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

beforeEach(async () => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabaseClient()

  const { requireAuth } = await import('@/lib/auth')
  ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: mockUser,
    supabase: mockSupabase,
  })
})

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.append(k, v)
  return fd
}

const validReminderData = {
  title: 'Date Night',
  message: 'Plan something special',
  category: 'custom',
  frequency: 'weekly',
  scheduled_for: '2026-03-01T18:00:00Z',
  notification_channel: 'email',
}

describe('createReminder', () => {
  it('creates a reminder with valid data', async () => {
    const { createReminder } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })

    const mockReminder = { id: mockReminderId, ...validReminderData }
    mockSupabase._queryBuilder.insert = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.select = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: mockReminder,
      error: null,
    })

    const fd = makeFormData(validReminderData)
    const result = await createReminder({}, fd)

    expect(result.success).toBe(true)
    expect(result.reminder).toEqual(mockReminder)
    expect(mockSupabase.from).toHaveBeenCalledWith('reminders')
  })

  it('returns error when title is missing', async () => {
    const { createReminder } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })

    const fd = makeFormData({ ...validReminderData, title: '' })
    const result = await createReminder({}, fd)

    expect(result.error).toBeTruthy()
    expect(result.error).toContain('Title is required')
  })

  it('returns error when user has no couple', async () => {
    const { createReminder } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: null },
      error: null,
    })

    const fd = makeFormData(validReminderData)
    const result = await createReminder({}, fd)

    expect(result.error).toBe('You must be in a couple to create reminders')
  })

  it('returns error on database insert failure', async () => {
    const { createReminder } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })

    mockSupabase._queryBuilder.insert = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.select = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Insert failed' },
    })

    const fd = makeFormData(validReminderData)
    const result = await createReminder({}, fd)

    expect(result.error).toBe('Something went wrong. Please try again.')
  })

  it('returns error when couple has reached 50 reminder cap', async () => {
    const { createReminder } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })

    // Mock the count query: select().eq() resolves with count: 50
    mockSupabase._queryBuilder.select = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi
      .fn()
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockResolvedValueOnce({ count: 50, data: null, error: null })

    const fd = makeFormData(validReminderData)
    const result = await createReminder({}, fd)

    expect(result.error).toContain('maximum of 50 reminders')
  })
})

describe('toggleReminder', () => {
  function setupCoupleProfile(): void {
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
  }

  it('toggles a reminder to inactive', async () => {
    const { toggleReminder } = await import('./actions')

    setupCoupleProfile()
    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    // eq calls: (1) profile .eq('id', user.id), (2) .eq('id', reminderId), (3) .eq('couple_id', ...)
    mockSupabase._queryBuilder.eq = vi
      .fn()
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockResolvedValueOnce({ data: null, error: null })

    const result = await toggleReminder(mockReminderId, false)

    expect(result).toEqual({})
    expect(mockSupabase.from).toHaveBeenCalledWith('reminders')
  })

  it('toggles a reminder to active', async () => {
    const { toggleReminder } = await import('./actions')

    setupCoupleProfile()
    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi
      .fn()
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockResolvedValueOnce({ data: null, error: null })

    const result = await toggleReminder(mockReminderId, true)

    expect(result).toEqual({})
  })

  it('returns error when no couple', async () => {
    const { toggleReminder } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: null },
      error: null,
    })

    const result = await toggleReminder(mockReminderId, true)

    expect(result.error).toBe('You must be in a couple')
  })

  it('returns error on database failure', async () => {
    const { toggleReminder } = await import('./actions')

    setupCoupleProfile()
    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi
      .fn()
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockResolvedValueOnce({ data: null, error: { message: 'Toggle failed' } })

    const result = await toggleReminder(mockReminderId, true)

    expect(result.error).toBe('Something went wrong. Please try again.')
  })
})

describe('deleteReminder', () => {
  function setupCoupleProfile(): void {
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
  }

  it('deletes a reminder', async () => {
    const { deleteReminder } = await import('./actions')

    setupCoupleProfile()
    mockSupabase._queryBuilder.delete = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    // eq calls: (1) profile .eq('id', user.id), (2) .eq('id', reminderId), (3) .eq('couple_id', ...)
    mockSupabase._queryBuilder.eq = vi
      .fn()
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockResolvedValueOnce({ data: null, error: null })

    const result = await deleteReminder(mockReminderId)

    expect(result).toEqual({})
    expect(mockSupabase.from).toHaveBeenCalledWith('reminders')
  })

  it('returns error when no couple', async () => {
    const { deleteReminder } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: null },
      error: null,
    })

    const result = await deleteReminder(mockReminderId)

    expect(result.error).toBe('You must be in a couple')
  })

  it('returns error on database failure', async () => {
    const { deleteReminder } = await import('./actions')

    setupCoupleProfile()
    mockSupabase._queryBuilder.delete = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi
      .fn()
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockResolvedValueOnce({ data: null, error: { message: 'Delete failed' } })

    const result = await deleteReminder(mockReminderId)

    expect(result.error).toBe('Something went wrong. Please try again.')
  })
})
