import { describe, it, expect, vi } from 'vitest'

import { getRecentActivity } from './activity'

type TableData = Record<string, unknown[]>

const mockUserId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function mockSupabase(tableData: TableData = {}) {
  return {
    from: vi.fn((table: string) => {
      // eslint-disable-next-line security/detect-object-injection -- table is from a hardcoded local string
      const data = tableData[table] ?? []
      const chain: Record<string, ReturnType<typeof vi.fn>> = {}
      const self = () => chain
      chain.select = vi.fn(self)
      chain.eq = vi.fn(self)
      chain.not = vi.fn(self)
      chain.or = vi.fn(self)
      chain.order = vi.fn(self)
      chain.limit = vi.fn().mockResolvedValue({ data, error: null })
      return chain
    }),
  }
}

describe('getRecentActivity', () => {
  it('returns empty array when no data', async () => {
    const sb = mockSupabase()

    const result = await getRecentActivity('c1', mockUserId, sb as never)

    expect(result).toEqual([])
  })

  it('maps check-in rows to ActivityItems', async () => {
    const sb = mockSupabase({
      check_ins: [{ completed_at: '2025-01-01T00:00:00Z', categories: ['Trust', 'Fun'] }],
    })

    const result = await getRecentActivity('c1', mockUserId, sb as never)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      type: 'check-in',
      title: 'Check-in completed',
      description: 'Trust, Fun',
      timestamp: '2025-01-01T00:00:00Z',
    })
  })

  it('truncates long note content to 50 chars', async () => {
    const longContent = 'A'.repeat(60)
    const sb = mockSupabase({
      notes: [{ content: longContent, created_at: '2025-01-01T00:00:00Z' }],
    })

    const result = await getRecentActivity('c1', mockUserId, sb as never)

    expect(result[0].title).toBe('A'.repeat(50) + '...')
    expect(result[0].type).toBe('note')
  })

  it('sorts all items by timestamp descending', async () => {
    const sb = mockSupabase({
      notes: [{ content: 'Older note', created_at: '2025-01-01T00:00:00Z' }],
      milestones: [
        { title: 'Newer milestone', achieved_at: '2025-06-01T00:00:00Z', created_at: '2025-05-01T00:00:00Z' },
      ],
    })

    const result = await getRecentActivity('c1', mockUserId, sb as never)

    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('milestone')
    expect(result[1].type).toBe('note')
  })

  it('respects the limit parameter', async () => {
    const sb = mockSupabase({
      notes: [
        { content: 'Note 1', created_at: '2025-01-01T00:00:00Z' },
        { content: 'Note 2', created_at: '2025-01-02T00:00:00Z' },
        { content: 'Note 3', created_at: '2025-01-03T00:00:00Z' },
      ],
    })

    const result = await getRecentActivity('c1', mockUserId, sb as never, 2)

    expect(result).toHaveLength(2)
  })

  it('handles check-in with null categories', async () => {
    const sb = mockSupabase({
      check_ins: [{ completed_at: '2025-01-01T00:00:00Z', categories: null }],
    })

    const result = await getRecentActivity('c1', mockUserId, sb as never)

    expect(result[0].description).toBe('General check-in')
  })
})
