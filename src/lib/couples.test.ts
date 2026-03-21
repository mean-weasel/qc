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
const mockInvite = {
  id: 'invite-1',
  couple_id: 'couple-1',
  invited_by: 'user-1',
  invited_email: 'partner@example.com',
  token: 'test-token-uuid',
  status: 'pending' as const,
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: '2025-01-01T00:00:00Z',
}

let mockSupabase: ReturnType<typeof createMockSupabaseClient>
let mockAdminSupabase: ReturnType<typeof createMockSupabaseClient>

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

async function getServerMock() {
  const mod = await import('@/lib/supabase/server')
  return mod.createClient as ReturnType<typeof vi.fn>
}

async function getAdminMock() {
  const mod = await import('@/lib/supabase/admin')
  return mod.createAdminClient as ReturnType<typeof vi.fn>
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
  mockAdminSupabase = createMockSupabaseClient()

  const createClientMock = await getServerMock()
  createClientMock.mockResolvedValue(mockSupabase)

  const createAdminClientMock = await getAdminMock()
  createAdminClientMock.mockReturnValue(mockAdminSupabase)
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

describe('createInvite', () => {
  it('creates an invite for the given email', async () => {
    const { createInvite } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase._queryBuilder.single
      .mockResolvedValueOnce({ data: { couple_id: 'couple-1' }, error: null })
      .mockResolvedValueOnce({ data: mockInvite, error: null })

    const result = await createInvite('partner@example.com')

    expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    expect(mockSupabase.from).toHaveBeenCalledWith('couple_invites')
    expect(mockSupabase._queryBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        couple_id: 'couple-1',
        invited_by: 'user-1',
        invited_email: 'partner@example.com',
      }),
    )
    expect(result).toEqual({ data: mockInvite, error: null })
  })

  it('returns error when not authenticated', async () => {
    const { createInvite } = await import('@/lib/couples')
    setupUnauthenticatedUser()

    const result = await createInvite('partner@example.com')

    expect(result).toEqual({ data: null, error: 'Not authenticated' })
  })

  it('returns error when user is not in a couple', async () => {
    const { createInvite } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({ data: { couple_id: null }, error: null })

    const result = await createInvite('partner@example.com')

    expect(result).toEqual({ data: null, error: 'Not in a couple' })
  })

  it('returns error when insert fails', async () => {
    const { createInvite } = await import('@/lib/couples')
    setupAuthenticatedUser()

    mockSupabase._queryBuilder.single
      .mockResolvedValueOnce({ data: { couple_id: 'couple-1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } })

    const result = await createInvite('partner@example.com')

    expect(result).toEqual({ data: null, error: 'Insert failed' })
  })

  it('accepts an existing client instead of creating a new one', async () => {
    const { createInvite } = await import('@/lib/couples')
    const existingClient = createMockSupabaseClient()
    existingClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    existingClient._queryBuilder.single
      .mockResolvedValueOnce({ data: { couple_id: 'couple-1' }, error: null })
      .mockResolvedValueOnce({ data: mockInvite, error: null })

    const result = await createInvite(
      'partner@example.com',
      existingClient as unknown as Parameters<typeof createInvite>[1],
    )

    expect(result).toEqual({ data: mockInvite, error: null })
    // The default server mock should not have been called
    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled()
  })
})

describe('resendInvite', () => {
  it('updates the invite with a new token and resets status', async () => {
    const { resendInvite } = await import('@/lib/couples')

    const updatedInvite = { ...mockInvite, token: 'new-token' }
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({ data: updatedInvite, error: null })

    const result = await resendInvite('invite-1')

    expect(mockSupabase.from).toHaveBeenCalledWith('couple_invites')
    expect(mockSupabase._queryBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        token: expect.any(String),
        expires_at: expect.any(String),
      }),
    )
    expect(mockSupabase._queryBuilder.eq).toHaveBeenCalledWith('id', 'invite-1')
    expect(result).toEqual({ data: updatedInvite, error: null })
  })

  it('returns error when the update fails', async () => {
    const { resendInvite } = await import('@/lib/couples')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'Update failed' } })

    const result = await resendInvite('invite-1')

    expect(result).toEqual({ data: null, error: 'Update failed' })
  })
})

describe('getInviteStatusByToken', () => {
  it('returns valid status for a pending, non-expired invite', async () => {
    const { getInviteStatusByToken } = await import('@/lib/couples')

    mockAdminSupabase._queryBuilder.single.mockResolvedValueOnce({ data: mockInvite, error: null })

    const result = await getInviteStatusByToken('test-token-uuid')

    expect(mockAdminSupabase.from).toHaveBeenCalledWith('couple_invites')
    expect(result).toEqual({ status: 'valid', invite: mockInvite })
  })

  it('returns not_found when no invite matches the token', async () => {
    const { getInviteStatusByToken } = await import('@/lib/couples')

    mockAdminSupabase._queryBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

    const result = await getInviteStatusByToken('bad-token')

    expect(result).toEqual({ status: 'not_found', invite: null })
  })

  it('returns accepted status when invite has already been accepted', async () => {
    const { getInviteStatusByToken } = await import('@/lib/couples')

    const acceptedInvite = { ...mockInvite, status: 'accepted' as const }
    mockAdminSupabase._queryBuilder.single.mockResolvedValueOnce({ data: acceptedInvite, error: null })

    const result = await getInviteStatusByToken('test-token-uuid')

    expect(result).toEqual({ status: 'accepted', invite: acceptedInvite })
  })

  it('returns expired status when invite status is expired', async () => {
    const { getInviteStatusByToken } = await import('@/lib/couples')

    const expiredInvite = { ...mockInvite, status: 'expired' as const }
    mockAdminSupabase._queryBuilder.single.mockResolvedValueOnce({ data: expiredInvite, error: null })

    const result = await getInviteStatusByToken('test-token-uuid')

    expect(result).toEqual({ status: 'expired', invite: expiredInvite })
  })

  it('returns expired status when invite expires_at is in the past', async () => {
    const { getInviteStatusByToken } = await import('@/lib/couples')

    const pastExpiredInvite = {
      ...mockInvite,
      status: 'pending' as const,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    }
    mockAdminSupabase._queryBuilder.single.mockResolvedValueOnce({ data: pastExpiredInvite, error: null })

    const result = await getInviteStatusByToken('test-token-uuid')

    expect(result).toEqual({ status: 'expired', invite: pastExpiredInvite })
  })
})

describe('acceptInvite', () => {
  // acceptInvite chains multiple .eq() calls:
  // Query 1 (fetch invite): .select('*').eq('token', ...).eq('status', 'pending').gt(...).single()
  //   — 2 eq calls, terminal = single()
  // Query 2 (join couple):  .update({...}).eq('id', user.id)
  //   — 1 eq call, terminal = eq() (3rd overall)
  // Query 3 (mark accepted): .update({...}).eq('id', invite.id)
  //   — 1 eq call, terminal = eq() (4th overall)
  //
  // Because the mock query builder is shared, we use mockReturnValueOnce(queryBuilder) to
  // keep the chain alive for intermediate calls and mockResolvedValueOnce for terminal calls.

  it('joins the couple and marks the invite as accepted', async () => {
    const { acceptInvite } = await import('@/lib/couples')
    setupAuthenticatedUser()

    const qb = mockAdminSupabase._queryBuilder
    // eq call 1 (.eq('token', ...)) — keep chain alive
    qb.eq.mockReturnValueOnce(qb)
    // eq call 2 (.eq('status', 'pending')) — keep chain alive
    qb.eq.mockReturnValueOnce(qb)
    // single() resolves with the invite
    qb.single.mockResolvedValueOnce({ data: mockInvite, error: null })
    // eq call 3 (.eq('id', user.id) — join couple, terminal, resolves with no error
    qb.eq.mockResolvedValueOnce({ error: null })
    // eq call 4 (.eq('id', invite.id) — mark accepted, terminal, resolves with no error
    qb.eq.mockResolvedValueOnce({ error: null })

    const result = await acceptInvite('test-token-uuid')

    expect(mockAdminSupabase.from).toHaveBeenCalledWith('couple_invites')
    expect(mockAdminSupabase.from).toHaveBeenCalledWith('profiles')
    expect(result).toEqual({ error: null })
  })

  it('returns error when not authenticated', async () => {
    const { acceptInvite } = await import('@/lib/couples')
    setupUnauthenticatedUser()

    const result = await acceptInvite('test-token-uuid')

    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when invite is not found or expired', async () => {
    const { acceptInvite } = await import('@/lib/couples')
    setupAuthenticatedUser()

    const qb = mockAdminSupabase._queryBuilder
    qb.eq.mockReturnValueOnce(qb)
    qb.eq.mockReturnValueOnce(qb)
    qb.single.mockResolvedValueOnce({ data: null, error: { message: 'Invite not found or expired' } })

    const result = await acceptInvite('bad-token')

    expect(result).toEqual({ error: 'Invite not found or expired' })
  })

  it('returns generic error when invite fetch returns no data and no error message', async () => {
    const { acceptInvite } = await import('@/lib/couples')
    setupAuthenticatedUser()

    const qb = mockAdminSupabase._queryBuilder
    qb.eq.mockReturnValueOnce(qb)
    qb.eq.mockReturnValueOnce(qb)
    qb.single.mockResolvedValueOnce({ data: null, error: null })

    const result = await acceptInvite('bad-token')

    expect(result).toEqual({ error: 'Invite not found or expired' })
  })

  it('returns error when joining the couple fails', async () => {
    const { acceptInvite } = await import('@/lib/couples')
    setupAuthenticatedUser()

    const qb = mockAdminSupabase._queryBuilder
    // eq calls 1 & 2: keep chain alive for the fetch query
    qb.eq.mockReturnValueOnce(qb)
    qb.eq.mockReturnValueOnce(qb)
    // single: fetch invite succeeds
    qb.single.mockResolvedValueOnce({ data: mockInvite, error: null })
    // eq call 3: join couple fails
    qb.eq.mockResolvedValueOnce({ error: { message: 'Join failed' } })

    const result = await acceptInvite('test-token-uuid')

    expect(result).toEqual({ error: 'Join failed' })
  })

  it('returns error when marking invite as accepted fails', async () => {
    const { acceptInvite } = await import('@/lib/couples')
    setupAuthenticatedUser()

    const qb = mockAdminSupabase._queryBuilder
    // eq calls 1 & 2: keep chain alive for the fetch query
    qb.eq.mockReturnValueOnce(qb)
    qb.eq.mockReturnValueOnce(qb)
    // single: fetch invite succeeds
    qb.single.mockResolvedValueOnce({ data: mockInvite, error: null })
    // eq call 3: join couple succeeds
    qb.eq.mockResolvedValueOnce({ error: null })
    // eq call 4: mark accepted fails
    qb.eq.mockResolvedValueOnce({ error: { message: 'Status update failed' } })

    const result = await acceptInvite('test-token-uuid')

    expect(result).toEqual({ error: 'Status update failed' })
  })
})
