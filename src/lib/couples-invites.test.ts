import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockUser = { id: 'user-1', email: 'test@example.com' }
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
  function setupAcceptChain(
    inviteResult: { data: unknown; error: unknown },
    joinResult?: { error: unknown },
    markResult?: { error: unknown },
  ): void {
    const qb = mockAdminSupabase._queryBuilder
    qb.eq.mockReturnValueOnce(qb)
    qb.eq.mockReturnValueOnce(qb)
    qb.single.mockResolvedValueOnce(inviteResult)
    if (joinResult) qb.eq.mockResolvedValueOnce(joinResult)
    if (markResult) qb.eq.mockResolvedValueOnce(markResult)
  }

  it('joins the couple and marks the invite as accepted', async () => {
    const { acceptInvite } = await import('@/lib/couples')
    setupAuthenticatedUser()
    setupAcceptChain({ data: mockInvite, error: null }, { error: null }, { error: null })
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
    setupAcceptChain({ data: null, error: { message: 'Invite not found or expired' } })
    const result = await acceptInvite('bad-token')
    expect(result).toEqual({ error: 'Invite not found or expired' })
  })

  it('returns generic error when invite fetch returns no data and no error message', async () => {
    const { acceptInvite } = await import('@/lib/couples')
    setupAuthenticatedUser()
    setupAcceptChain({ data: null, error: null })
    const result = await acceptInvite('bad-token')
    expect(result).toEqual({ error: 'Invite not found or expired' })
  })

  it('returns error when joining the couple fails', async () => {
    const { acceptInvite } = await import('@/lib/couples')
    setupAuthenticatedUser()
    setupAcceptChain({ data: mockInvite, error: null }, { error: { message: 'Join failed' } })
    const result = await acceptInvite('test-token-uuid')
    expect(result).toEqual({ error: 'Join failed' })
  })

  it('returns error when marking invite as accepted fails', async () => {
    const { acceptInvite } = await import('@/lib/couples')
    setupAuthenticatedUser()
    setupAcceptChain({ data: mockInvite, error: null }, { error: null }, { error: { message: 'Status update failed' } })
    const result = await acceptInvite('test-token-uuid')
    expect(result).toEqual({ error: 'Status update failed' })
  })
})
