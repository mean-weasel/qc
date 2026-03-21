import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@/lib/checkin-operations', () => ({
  insertCheckIn: vi.fn(),
  updateCheckInStatus: vi.fn(),
  saveDraftMoodReflection: vi.fn(),
  insertNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  insertActionItem: vi.fn(),
  updateActionItemDb: vi.fn(),
  deleteActionItem: vi.fn(),
  toggleActionItemDb: vi.fn(),
}))
vi.mock('@/contexts/check-in-reducer', () => ({
  createInitialSession: vi.fn(),
}))
vi.mock('@/app/(app)/checkin/actions', () => ({
  sendCheckInSummaryEmail: vi.fn().mockResolvedValue(undefined),
}))

import { useCheckInMutations } from '@/contexts/useCheckInMutations'
import type { UseCheckInMutationsParams } from '@/contexts/useCheckInMutations'
import type { CheckInContextState } from '@/types/checkin'
import type { Note } from '@/types'
import { insertNote, updateNote, deleteNote, saveDraftMoodReflection } from '@/lib/checkin-operations'

const SESSION_ID = 'session-1'
const COUPLE_ID = 'couple-1'
const USER_ID = 'user-1'

const fakeSession = {
  id: SESSION_ID,
  baseCheckIn: {
    id: SESSION_ID,
    coupleId: COUPLE_ID,
    startedAt: '2026-01-01T00:00:00Z',
    completedAt: null,
    status: 'in-progress' as const,
    categories: ['communication'],
    moodBefore: null,
    moodAfter: null,
    reflection: null,
  },
  progress: {
    currentStep: 'welcome' as const,
    completedSteps: [],
    totalSteps: 7,
    percentage: 0,
  },
  selectedCategories: ['communication'],
  categoryProgress: [],
  draftNotes: [],
  startedAt: '2026-01-01T00:00:00Z',
  lastSavedAt: '2026-01-01T00:00:00Z',
}

const stateWithSession: CheckInContextState = {
  session: fakeSession,
  isLoading: false,
  error: null,
}

const stateNoSession: CheckInContextState = {
  session: null,
  isLoading: false,
  error: null,
}

function makeParams(
  overrides?: Partial<UseCheckInMutationsParams>,
): UseCheckInMutationsParams & { dispatch: ReturnType<typeof vi.fn> } {
  const dispatch = vi.fn()
  const params = {
    state: stateWithSession,
    dispatch,
    coupleId: COUPLE_ID,
    userId: USER_ID,
    actionItems: [],
    ...overrides,
  }
  return params as UseCheckInMutationsParams & { dispatch: ReturnType<typeof vi.fn> }
}

describe('useCheckInMutations — addDraftNote', () => {
  beforeEach(() => vi.clearAllMocks())

  const fakeDbNote = {
    id: 'note-1',
    couple_id: COUPLE_ID,
    author_id: USER_ID,
    check_in_id: SESSION_ID,
    content: 'Test note',
    privacy: 'draft',
    tags: [],
    category_id: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  }

  it('inserts note and dispatches ADD_DRAFT_NOTE on success', async () => {
    vi.mocked(insertNote).mockResolvedValue({ data: fakeDbNote, error: null } as never)
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    const noteInput: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
      coupleId: COUPLE_ID,
      authorId: USER_ID,
      checkInId: SESSION_ID,
      content: 'Test note',
      privacy: 'draft',
      tags: [],
      categoryId: null,
    }

    await act(() => result.current.addDraftNote(noteInput))

    expect(insertNote).toHaveBeenCalledWith(
      expect.objectContaining({
        coupleId: COUPLE_ID,
        authorId: USER_ID,
        checkInId: SESSION_ID,
        content: 'Test note',
      }),
    )
    expect(params.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'ADD_DRAFT_NOTE' }))
  })

  it('dispatches SET_ERROR when insertNote fails', async () => {
    vi.mocked(insertNote).mockResolvedValue({ data: null, error: { message: 'fail' } } as never)
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    const noteInput: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
      coupleId: COUPLE_ID,
      authorId: USER_ID,
      checkInId: null,
      content: 'Bad note',
      privacy: 'draft',
      tags: [],
      categoryId: null,
    }

    await act(() => result.current.addDraftNote(noteInput))

    expect(params.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_ERROR' }))
  })

  it('uses null for checkInId when no session exists', async () => {
    vi.mocked(insertNote).mockResolvedValue({ data: { ...fakeDbNote, check_in_id: null }, error: null } as never)
    const params = makeParams({ state: stateNoSession })
    const { result } = renderHook(() => useCheckInMutations(params))

    const noteInput: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
      coupleId: COUPLE_ID,
      authorId: USER_ID,
      checkInId: null,
      content: 'Sessionless note',
      privacy: 'draft',
      tags: [],
      categoryId: null,
    }

    await act(() => result.current.addDraftNote(noteInput))

    expect(insertNote).toHaveBeenCalledWith(expect.objectContaining({ checkInId: null }))
  })
})

describe('useCheckInMutations — updateDraftNote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls updateNote and dispatches UPDATE_DRAFT_NOTE', async () => {
    vi.mocked(updateNote).mockResolvedValue({} as never)
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    await act(() => result.current.updateDraftNote('note-1', { content: 'Updated' }))

    expect(updateNote).toHaveBeenCalledWith('note-1', { content: 'Updated' })
    expect(params.dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_DRAFT_NOTE',
      payload: { noteId: 'note-1', updates: { content: 'Updated' } },
    })
  })
})

describe('useCheckInMutations — removeDraftNote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls deleteNote and dispatches REMOVE_DRAFT_NOTE', async () => {
    vi.mocked(deleteNote).mockResolvedValue({} as never)
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    await act(() => result.current.removeDraftNote('note-1'))

    expect(deleteNote).toHaveBeenCalledWith('note-1')
    expect(params.dispatch).toHaveBeenCalledWith({
      type: 'REMOVE_DRAFT_NOTE',
      payload: { noteId: 'note-1' },
    })
  })
})

describe('useCheckInMutations — saveMoodDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls saveDraftMoodReflection after 5000ms debounce', async () => {
    vi.mocked(saveDraftMoodReflection).mockResolvedValue({} as never)
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))
    act(() => result.current.saveMoodDraft(7, 9, 'Great session'))
    expect(saveDraftMoodReflection).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(saveDraftMoodReflection).toHaveBeenCalledWith(SESSION_ID, 7, 9, 'Great session')
  })

  it('does not call saveDraftMoodReflection when no session exists', async () => {
    const params = makeParams({ state: stateNoSession })
    const { result } = renderHook(() => useCheckInMutations(params))
    act(() => result.current.saveMoodDraft(5, null, null))
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(saveDraftMoodReflection).not.toHaveBeenCalled()
  })

  it('debounces — only fires once for rapid calls', async () => {
    vi.mocked(saveDraftMoodReflection).mockResolvedValue({} as never)
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))
    act(() => {
      result.current.saveMoodDraft(1, null, 'first')
      result.current.saveMoodDraft(2, null, 'second')
      result.current.saveMoodDraft(3, null, 'third')
    })
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(saveDraftMoodReflection).toHaveBeenCalledTimes(1)
    expect(saveDraftMoodReflection).toHaveBeenCalledWith(SESSION_ID, 3, null, 'third')
  })
})
