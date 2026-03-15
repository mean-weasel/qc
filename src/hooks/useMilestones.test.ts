import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockSupabase = createMockSupabaseClient()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

const { useMilestones } = await import('@/hooks/useMilestones')

const MILESTONE_ROW = {
  id: 'ms-1',
  couple_id: 'couple-abc',
  title: 'First Check-in',
  description: 'Completed our first check-in',
  category: 'relationship',
  icon: '🎉',
  achieved_at: '2025-01-15T00:00:00Z',
  rarity: 'common',
  points: 10,
  photo_url: null,
}

function setupFetchMilestones(rows: Record<string, unknown>[] = [MILESTONE_ROW]) {
  mockSupabase._queryBuilder.order.mockResolvedValueOnce({
    data: rows,
    error: null,
  })
}

describe('useMilestones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset chainable methods to return this
    for (const key of Object.keys(mockSupabase._queryBuilder)) {
      if (key !== 'single' && key !== 'maybeSingle' && key !== 'order') {
        // eslint-disable-next-line security/detect-object-injection -- key is from Object.keys() of the same mock object
        mockSupabase._queryBuilder[key].mockReturnThis()
      }
    }
    mockSupabase._queryBuilder.single.mockResolvedValue({ data: null, error: null })
    mockSupabase._queryBuilder.order.mockResolvedValue({ data: [], error: null })
  })

  it('fetches milestones for couple on mount', async () => {
    setupFetchMilestones()

    const { result } = renderHook(() => useMilestones('couple-abc'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('milestones')
    expect(mockSupabase._queryBuilder.eq).toHaveBeenCalledWith('couple_id', 'couple-abc')
    expect(result.current.milestones).toHaveLength(1)
    expect(result.current.milestones[0].id).toBe('ms-1')
    expect(result.current.milestones[0].title).toBe('First Check-in')
    expect(result.current.error).toBeNull()
  })

  it('creates a milestone', async () => {
    setupFetchMilestones([])

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'ms-new',
        couple_id: 'couple-abc',
        title: 'New Milestone',
        description: 'A new achievement',
        category: 'growth',
        icon: '🌱',
        achieved_at: null,
        rarity: 'common',
        points: 10,
        photo_url: null,
      },
      error: null,
    })

    const { result } = renderHook(() => useMilestones('couple-abc'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let created: unknown
    await act(async () => {
      created = await result.current.createMilestone({
        title: 'New Milestone',
        description: 'A new achievement',
        category: 'growth',
        icon: '🌱',
      })
    })

    expect(mockSupabase._queryBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        couple_id: 'couple-abc',
        title: 'New Milestone',
        category: 'growth',
      }),
    )
    expect((created as Record<string, unknown>).id).toBe('ms-new')
    expect(result.current.milestones).toHaveLength(1)
  })

  it('throws when couple has reached 200 milestone cap', async () => {
    setupFetchMilestones([])

    const { result } = renderHook(() => useMilestones('couple-abc'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Mock the count query: select().eq() resolves with count: 200
    mockSupabase._queryBuilder.eq.mockResolvedValueOnce({ count: 200, data: null, error: null })

    await act(async () => {
      await expect(
        result.current.createMilestone({
          title: 'Over Cap',
          description: 'Too many',
          category: 'growth',
          icon: '🌱',
        }),
      ).rejects.toThrow('maximum of 200 milestones')
    })
  })

  it('updates a milestone', async () => {
    setupFetchMilestones()

    const updatedRow = { ...MILESTONE_ROW, title: 'Updated Title' }
    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: updatedRow,
      error: null,
    })

    const { result } = renderHook(() => useMilestones('couple-abc'))

    await waitFor(() => {
      expect(result.current.milestones).toHaveLength(1)
    })

    await act(async () => {
      await result.current.updateMilestone('ms-1', { title: 'Updated Title' })
    })

    expect(mockSupabase._queryBuilder.update).toHaveBeenCalledWith({ title: 'Updated Title' })
    expect(result.current.milestones[0].title).toBe('Updated Title')
  })

  it('deletes a milestone', async () => {
    setupFetchMilestones()

    const { result } = renderHook(() => useMilestones('couple-abc'))

    await waitFor(() => {
      expect(result.current.milestones).toHaveLength(1)
    })

    // Set eq to resolve for the terminal .delete().eq('id', id) call
    mockSupabase._queryBuilder.eq.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    await act(async () => {
      await result.current.deleteMilestone('ms-1')
    })

    expect(mockSupabase._queryBuilder.delete).toHaveBeenCalled()
    expect(result.current.milestones).toHaveLength(0)
  })
})
