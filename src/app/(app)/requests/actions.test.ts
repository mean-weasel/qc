import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockUser = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }
const mockCoupleId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const mockPartnerId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const mockRequestId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

let mockSupabase: ReturnType<typeof createMockSupabaseClient>

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    check: vi.fn().mockResolvedValue(true),
  })),
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

const validRequestData = {
  requested_for: mockPartnerId,
  title: 'Date Night',
  description: 'Plan a fun evening',
  category: 'date-night',
  priority: 'medium',
}

describe('createRequest', () => {
  it('creates a request with valid data', async () => {
    const { createRequest } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
    mockSupabase._queryBuilder.insert = vi.fn().mockReturnValue({ data: null, error: null })

    const fd = makeFormData(validRequestData)
    const result = await createRequest({}, fd)

    expect(result).toEqual({ success: true })
    expect(mockSupabase.from).toHaveBeenCalledWith('requests')
  })

  it('returns error for invalid partner UUID', async () => {
    const { createRequest } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })

    const fd = makeFormData({ ...validRequestData, requested_for: 'not-a-uuid' })
    const result = await createRequest({}, fd)

    expect(result.error).toBeTruthy()
  })

  it('returns error when title is missing', async () => {
    const { createRequest } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })

    const fd = makeFormData({ ...validRequestData, title: '' })
    const result = await createRequest({}, fd)

    expect(result.error).toBeTruthy()
    expect(result.error).toContain('Title is required')
  })

  it('returns error when user has no couple', async () => {
    const { createRequest } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: null },
      error: null,
    })

    const fd = makeFormData(validRequestData)
    const result = await createRequest({}, fd)

    expect(result.error).toBe('You must be in a couple to create requests')
  })

  it('returns error on database insert failure', async () => {
    const { createRequest } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
    mockSupabase._queryBuilder.insert = vi.fn().mockReturnValue({
      data: null,
      error: { message: 'Insert failed' },
    })

    const fd = makeFormData(validRequestData)
    const result = await createRequest({}, fd)

    expect(result.error).toBe('Something went wrong. Please try again.')
  })

  it('returns error when couple has reached 100 request cap', async () => {
    const { createRequest } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })

    // Mock the count query: select().eq() resolves with count: 100
    mockSupabase._queryBuilder.select = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi
      .fn()
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockResolvedValueOnce({ count: 100, data: null, error: null })

    const fd = makeFormData(validRequestData)
    const result = await createRequest({}, fd)

    expect(result.error).toContain('maximum of 100 requests')
  })
})

describe('respondToRequest', () => {
  it('accepts a request', async () => {
    const { respondToRequest } = await import('./actions')

    // Mock profile lookup and request lookup
    let callCount = 0
    mockSupabase._queryBuilder.single = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount <= 2) {
        return Promise.resolve({ data: { couple_id: mockCoupleId }, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)

    const result = await respondToRequest(mockRequestId, 'accepted')

    expect(result).toEqual({})
    expect(mockSupabase.from).toHaveBeenCalledWith('requests')
  })

  it('declines a request', async () => {
    const { respondToRequest } = await import('./actions')

    let callCount = 0
    mockSupabase._queryBuilder.single = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount <= 2) {
        return Promise.resolve({ data: { couple_id: mockCoupleId }, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)

    const result = await respondToRequest(mockRequestId, 'declined')

    expect(result).toEqual({})
  })

  it('returns error on database failure', async () => {
    const { respondToRequest } = await import('./actions')

    let callCount = 0
    mockSupabase._queryBuilder.single = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount <= 2) {
        return Promise.resolve({ data: { couple_id: mockCoupleId }, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.update = vi.fn().mockImplementation(() => {
      mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Update failed' },
      })
      return mockSupabase._queryBuilder
    })

    const result = await respondToRequest(mockRequestId, 'accepted')

    expect(result.error).toBe('Something went wrong. Please try again.')
  })
})

describe('deleteRequest', () => {
  it('deletes a request', async () => {
    const { deleteRequest } = await import('./actions')

    let callCount = 0
    mockSupabase._queryBuilder.single = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount <= 2) {
        return Promise.resolve({ data: { couple_id: mockCoupleId }, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.delete = vi.fn().mockReturnValue(mockSupabase._queryBuilder)

    const result = await deleteRequest(mockRequestId)

    expect(result).toEqual({})
    expect(mockSupabase.from).toHaveBeenCalledWith('requests')
  })

  it('returns error on database failure', async () => {
    const { deleteRequest } = await import('./actions')

    let callCount = 0
    mockSupabase._queryBuilder.single = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount <= 2) {
        return Promise.resolve({ data: { couple_id: mockCoupleId }, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.delete = vi.fn().mockImplementation(() => {
      mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({
        data: null,
        error: { message: 'Delete failed' },
      })
      return mockSupabase._queryBuilder
    })

    const result = await deleteRequest(mockRequestId)

    expect(result.error).toBe('Something went wrong. Please try again.')
  })
})
