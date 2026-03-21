import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockUser = { id: 'user-1', email: 'test@example.com' }
const mockCouple = {
  id: 'couple-1',
  name: 'Test Couple',
  relationship_start_date: null,
  settings: {},
  created_at: '2025-01-01T00:00:00Z',
}
const mockPartnerProfile = {
  id: 'user-2',
  email: 'partner@example.com',
  display_name: 'Partner',
  avatar_url: null,
  plan: 'free',
  couple_id: 'couple-1',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}
let mockSupabase: ReturnType<typeof createMockSupabaseClient>

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

async function getServerMock() {
  const mod = await import('@/lib/supabase/server')
  return mod.createClient as ReturnType<typeof vi.fn>
}

function setupAuthenticatedUser() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null,
  })
}

function setupUnauthenticatedUser() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  })
}

beforeEach(async () => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabaseClient()
  const createClientMock = await getServerMock()
  createClientMock.mockResolvedValue(mockSupabase)
})

describe('createCouple', () => {
  it('creates a couple and updates profile', async () => {
    const { createCouple } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase.rpc.mockResolvedValueOnce({ data: 'couple-1', error: null })
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({ data: mockCouple, error: null })

    const result = await createCouple('Our Couple')

    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_couple_for_user', {
      p_user_id: mockUser.id,
      p_couple_name: 'Our Couple',
    })
    expect(mockSupabase.from).toHaveBeenCalledWith('couples')
    expect(result).toEqual({ data: mockCouple, error: null })
  })

  it('creates a couple with null name when no name provided', async () => {
    const { createCouple } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase.rpc.mockResolvedValueOnce({ data: 'couple-1', error: null })
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({ data: mockCouple, error: null })

    await createCouple()

    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_couple_for_user', {
      p_user_id: mockUser.id,
      p_couple_name: null,
    })
  })

  it('returns error when not authenticated', async () => {
    const { createCouple } = await import('@/lib/couples')
    setupUnauthenticatedUser()

    const result = await createCouple()

    expect(result).toEqual({ data: null, error: 'Not authenticated' })
  })

  it('returns error when couple rpc fails', async () => {
    const { createCouple } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Insert failed' },
    })

    const result = await createCouple('Test')

    expect(result).toEqual({ data: null, error: 'Insert failed' })
  })

  it('falls back to minimal response when fetch after create fails', async () => {
    const { createCouple } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase.rpc.mockResolvedValueOnce({ data: 'couple-1', error: null })
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Fetch failed' },
    })

    const result = await createCouple('Test')

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ id: 'couple-1', name: 'Test' })
  })
})

describe('getCouple', () => {
  it('returns the couple for the authenticated user', async () => {
    const { getCouple } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase._queryBuilder.single
      .mockResolvedValueOnce({ data: { couple_id: 'couple-1' }, error: null })
      .mockResolvedValueOnce({ data: mockCouple, error: null })

    const result = await getCouple()

    expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    expect(mockSupabase.from).toHaveBeenCalledWith('couples')
    expect(result).toEqual({ data: mockCouple, error: null })
  })

  it('returns error when not authenticated', async () => {
    const { getCouple } = await import('@/lib/couples')
    setupUnauthenticatedUser()

    const result = await getCouple()

    expect(result).toEqual({ data: null, error: 'Not authenticated' })
  })

  it('returns null data when profile has no couple_id', async () => {
    const { getCouple } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: null },
      error: null,
    })

    const result = await getCouple()

    expect(result).toEqual({ data: null, error: null })
  })

  it('returns error when couple query fails', async () => {
    const { getCouple } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase._queryBuilder.single
      .mockResolvedValueOnce({ data: { couple_id: 'couple-1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Couple not found' } })

    const result = await getCouple()

    expect(result).toEqual({ data: null, error: 'Couple not found' })
  })
})

describe('getPartner', () => {
  it('returns the partner profile', async () => {
    const { getPartner } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase._queryBuilder.single
      .mockResolvedValueOnce({ data: { couple_id: 'couple-1' }, error: null })
      .mockResolvedValueOnce({ data: mockPartnerProfile, error: null })

    const result = await getPartner()

    expect(mockSupabase._queryBuilder.neq).toHaveBeenCalledWith('id', 'user-1')
    expect(result).toEqual({ data: mockPartnerProfile, error: null })
  })

  it('returns error when not authenticated', async () => {
    const { getPartner } = await import('@/lib/couples')
    setupUnauthenticatedUser()

    const result = await getPartner()

    expect(result).toEqual({ data: null, error: 'Not authenticated' })
  })

  it('returns error when user has no couple', async () => {
    const { getPartner } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: null },
      error: null,
    })

    const result = await getPartner()

    expect(result).toEqual({ data: null, error: 'Not in a couple' })
  })

  it('returns error when partner query fails', async () => {
    const { getPartner } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase._queryBuilder.single
      .mockResolvedValueOnce({ data: { couple_id: 'couple-1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Partner not found' } })

    const result = await getPartner()

    expect(result).toEqual({ data: null, error: 'Partner not found' })
  })
})

describe('joinCouple', () => {
  it('updates profile couple_id to the given couple', async () => {
    const { joinCouple } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase._queryBuilder.eq.mockResolvedValueOnce({ error: null })

    const result = await joinCouple('couple-1')

    expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    expect(mockSupabase._queryBuilder.update).toHaveBeenCalledWith({ couple_id: 'couple-1' })
    expect(result).toEqual({ error: null })
  })

  it('returns error when not authenticated', async () => {
    const { joinCouple } = await import('@/lib/couples')
    setupUnauthenticatedUser()

    const result = await joinCouple('couple-1')

    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when profile update fails', async () => {
    const { joinCouple } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase._queryBuilder.eq.mockResolvedValueOnce({ error: { message: 'Update failed' } })

    const result = await joinCouple('couple-1')

    expect(result).toEqual({ error: 'Update failed' })
  })
})

describe('leaveCouple', () => {
  it('clears couple_id on the user profile', async () => {
    const { leaveCouple } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase._queryBuilder.eq.mockResolvedValueOnce({ error: null })

    const result = await leaveCouple()

    expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    expect(mockSupabase._queryBuilder.update).toHaveBeenCalledWith({ couple_id: null })
    expect(result).toEqual({ error: null })
  })

  it('returns error when not authenticated', async () => {
    const { leaveCouple } = await import('@/lib/couples')
    setupUnauthenticatedUser()

    const result = await leaveCouple()

    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when profile update fails', async () => {
    const { leaveCouple } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase._queryBuilder.eq.mockResolvedValueOnce({ error: { message: 'DB error' } })

    const result = await leaveCouple()

    expect(result).toEqual({ error: 'DB error' })
  })
})
