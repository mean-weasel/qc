import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
          }),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

let uuidCounter = 0
vi.stubGlobal('crypto', { randomUUID: () => `uuid-${++uuidCounter}` })

const mockStorage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, value: string) => mockStorage.set(key, value),
  removeItem: (key: string) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
})

// Dynamic import after mocks are in place
const { BookendsProvider, useBookends } = await import('./BookendsContext')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <BookendsProvider coupleId="couple-1" userId="user-1">
      {children}
    </BookendsProvider>
  )
}

beforeEach(() => {
  uuidCounter = 0
  mockMaybeSingle.mockResolvedValue({ data: null, error: null })
  mockStorage.clear()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BookendsContext', () => {
  it('useBookends throws outside provider', () => {
    expect(() => renderHook(() => useBookends())).toThrow('useBookends must be used within BookendsProvider')
  })

  it('starts with null preparation and reflection', () => {
    const { result } = renderHook(() => useBookends(), { wrapper })
    expect(result.current.preparation).toBeNull()
    expect(result.current.reflection).toBeNull()
  })

  it('addMyTopic creates preparation and adds topic', () => {
    const { result } = renderHook(() => useBookends(), { wrapper })
    act(() => result.current.addMyTopic('Talk about work'))
    expect(result.current.preparation).not.toBeNull()
    expect(result.current.preparation!.myTopics).toHaveLength(1)
    expect(result.current.preparation!.myTopics[0].content).toBe('Talk about work')
    expect(result.current.preparation!.myTopics[0].authorId).toBe('user-1')
    expect(result.current.preparation!.myTopics[0].isQuickTopic).toBe(false)
  })

  it('removeMyTopic removes the topic', () => {
    const { result } = renderHook(() => useBookends(), { wrapper })
    act(() => result.current.addMyTopic('Topic A'))
    const topicId = result.current.preparation!.myTopics[0].id
    act(() => result.current.removeMyTopic(topicId))
    expect(result.current.preparation!.myTopics).toHaveLength(0)
  })

  it('reorderMyTopics replaces topics array', () => {
    const { result } = renderHook(() => useBookends(), { wrapper })
    act(() => {
      result.current.addMyTopic('First')
      result.current.addMyTopic('Second')
    })
    const reversed = [...result.current.preparation!.myTopics].reverse()
    act(() => result.current.reorderMyTopics(reversed))
    expect(result.current.preparation!.myTopics[0].content).toBe('Second')
    expect(result.current.preparation!.myTopics[1].content).toBe('First')
  })

  it('clearPreparation resets to null', () => {
    const { result } = renderHook(() => useBookends(), { wrapper })
    act(() => result.current.addMyTopic('Topic'))
    expect(result.current.preparation).not.toBeNull()
    act(() => result.current.clearPreparation())
    expect(result.current.preparation).toBeNull()
  })

  it('openPreparationModal and closePreparationModal toggle state', () => {
    const { result } = renderHook(() => useBookends(), { wrapper })
    expect(result.current.isPreparationModalOpen).toBe(false)
    act(() => result.current.openPreparationModal())
    expect(result.current.isPreparationModalOpen).toBe(true)
    act(() => result.current.closePreparationModal())
    expect(result.current.isPreparationModalOpen).toBe(false)
  })

  it('openReflectionModal resets reflection and opens modal', () => {
    const { result } = renderHook(() => useBookends(), { wrapper })
    act(() => result.current.openReflectionModal())
    expect(result.current.isReflectionModalOpen).toBe(true)
    expect(result.current.reflection).toBeNull()
  })
})
