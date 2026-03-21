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
// prevent dynamic import of checkin actions from throwing
vi.mock('@/app/(app)/checkin/actions', () => ({
  sendCheckInSummaryEmail: vi.fn().mockResolvedValue(undefined),
}))

import { useCheckInMutations } from '@/contexts/useCheckInMutations'
import type { UseCheckInMutationsParams } from '@/contexts/useCheckInMutations'
import type { CheckInContextState } from '@/types/checkin'
import type { ActionItem, Note } from '@/types'
import {
  insertCheckIn,
  updateCheckInStatus,
  saveDraftMoodReflection,
  insertNote,
  updateNote,
  deleteNote,
  insertActionItem,
  updateActionItemDb,
  deleteActionItem,
  toggleActionItemDb,
} from '@/lib/checkin-operations'
import { createInitialSession } from '@/contexts/check-in-reducer'

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

const fakeActionItem: ActionItem = {
  id: 'ai-1',
  coupleId: COUPLE_ID,
  checkInId: SESSION_ID,
  title: 'Follow up',
  description: null,
  assignedTo: null,
  dueDate: null,
  completed: false,
  completedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
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

describe('useCheckInMutations — clearError', () => {
  beforeEach(() => vi.clearAllMocks())

  it('dispatches CLEAR_ERROR', () => {
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    act(() => result.current.clearError())

    expect(params.dispatch).toHaveBeenCalledWith({ type: 'CLEAR_ERROR' })
  })
})

describe('useCheckInMutations — goToStep / completeStep / updateCategoryProgress / saveSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('goToStep dispatches GO_TO_STEP', () => {
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    act(() => result.current.goToStep('warm-up'))

    expect(params.dispatch).toHaveBeenCalledWith({ type: 'GO_TO_STEP', payload: { step: 'warm-up' } })
  })

  it('completeStep dispatches COMPLETE_STEP', () => {
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    act(() => result.current.completeStep('reflection'))

    expect(params.dispatch).toHaveBeenCalledWith({ type: 'COMPLETE_STEP', payload: { step: 'reflection' } })
  })

  it('updateCategoryProgress dispatches SET_CATEGORY_PROGRESS', () => {
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    act(() => result.current.updateCategoryProgress('communication', { isCompleted: true }))

    expect(params.dispatch).toHaveBeenCalledWith({
      type: 'SET_CATEGORY_PROGRESS',
      payload: { categoryId: 'communication', progress: { isCompleted: true } },
    })
  })

  it('saveSession dispatches SAVE_SESSION', () => {
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    act(() => result.current.saveSession())

    expect(params.dispatch).toHaveBeenCalledWith({ type: 'SAVE_SESSION' })
  })
})

describe('useCheckInMutations — startCheckIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts check-in and dispatches RESTORE_SESSION on success', async () => {
    const newSession = { ...fakeSession, id: 'new-id', baseCheckIn: { ...fakeSession.baseCheckIn, id: 'new-id' } }
    vi.mocked(createInitialSession).mockReturnValue(newSession)
    vi.mocked(insertCheckIn).mockResolvedValue({ data: { id: 'new-id' }, error: null } as never)

    const params = makeParams({ state: stateNoSession })
    const { result } = renderHook(() => useCheckInMutations(params))

    await act(() => result.current.startCheckIn(['communication']))

    expect(createInitialSession).toHaveBeenCalledWith(['communication'], COUPLE_ID)
    expect(insertCheckIn).toHaveBeenCalled()
    expect(params.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'RESTORE_SESSION' }))
  })

  it('dispatches SET_ERROR when insertCheckIn fails', async () => {
    const newSession = { ...fakeSession }
    vi.mocked(createInitialSession).mockReturnValue(newSession)
    vi.mocked(insertCheckIn).mockResolvedValue({ data: null, error: { message: 'DB error' } } as never)

    const params = makeParams({ state: stateNoSession })
    const { result } = renderHook(() => useCheckInMutations(params))

    await act(() => result.current.startCheckIn(['communication']))

    expect(params.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_ERROR' }))
  })

  it('no-ops when a session already exists', async () => {
    const params = makeParams({ state: stateWithSession })
    const { result } = renderHook(() => useCheckInMutations(params))

    await act(() => result.current.startCheckIn(['communication']))

    expect(insertCheckIn).not.toHaveBeenCalled()
  })
})

describe('useCheckInMutations — completeCheckIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates status to completed and dispatches COMPLETE_CHECKIN', async () => {
    vi.mocked(updateCheckInStatus).mockResolvedValue({ data: {}, error: null } as never)
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    let returned: boolean | undefined
    await act(async () => {
      returned = await result.current.completeCheckIn()
    })

    expect(updateCheckInStatus).toHaveBeenCalledWith(SESSION_ID, 'completed')
    expect(params.dispatch).toHaveBeenCalledWith({ type: 'COMPLETE_CHECKIN' })
    expect(returned).toBe(true)
  })

  it('dispatches SET_ERROR and returns false when update fails', async () => {
    vi.mocked(updateCheckInStatus).mockResolvedValue({ data: null, error: { message: 'fail' } } as never)
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    let returned: boolean | undefined
    await act(async () => {
      returned = await result.current.completeCheckIn()
    })

    expect(params.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_ERROR' }))
    expect(returned).toBe(false)
  })

  it('returns false immediately when no session exists', async () => {
    const params = makeParams({ state: stateNoSession })
    const { result } = renderHook(() => useCheckInMutations(params))

    let returned: boolean | undefined
    await act(async () => {
      returned = await result.current.completeCheckIn()
    })

    expect(updateCheckInStatus).not.toHaveBeenCalled()
    expect(returned).toBe(false)
  })
})

describe('useCheckInMutations — abandonCheckIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates status to abandoned and dispatches ABANDON_CHECKIN', async () => {
    vi.mocked(updateCheckInStatus).mockResolvedValue({ data: {}, error: null } as never)
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    let returned: boolean | undefined
    await act(async () => {
      returned = await result.current.abandonCheckIn()
    })

    expect(updateCheckInStatus).toHaveBeenCalledWith(SESSION_ID, 'abandoned')
    expect(params.dispatch).toHaveBeenCalledWith({ type: 'ABANDON_CHECKIN' })
    expect(returned).toBe(true)
  })

  it('dispatches SET_ERROR and returns false on failure', async () => {
    vi.mocked(updateCheckInStatus).mockResolvedValue({ data: null, error: { message: 'oops' } } as never)
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    let returned: boolean | undefined
    await act(async () => {
      returned = await result.current.abandonCheckIn()
    })

    expect(params.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_ERROR' }))
    expect(returned).toBe(false)
  })

  it('returns false immediately when no session exists', async () => {
    const params = makeParams({ state: stateNoSession })
    const { result } = renderHook(() => useCheckInMutations(params))

    let returned: boolean | undefined
    await act(async () => {
      returned = await result.current.abandonCheckIn()
    })

    expect(updateCheckInStatus).not.toHaveBeenCalled()
    expect(returned).toBe(false)
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

describe('useCheckInMutations — addActionItem', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls insertActionItem with correct params', async () => {
    vi.mocked(insertActionItem).mockResolvedValue({} as never)
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    const input: Omit<ActionItem, 'id' | 'createdAt'> = {
      coupleId: COUPLE_ID,
      checkInId: SESSION_ID,
      title: 'Follow up',
      description: null,
      assignedTo: null,
      dueDate: null,
      completed: false,
      completedAt: null,
    }

    await act(() => result.current.addActionItem(input))

    expect(insertActionItem).toHaveBeenCalledWith(
      expect.objectContaining({
        coupleId: COUPLE_ID,
        checkInId: SESSION_ID,
        title: 'Follow up',
      }),
    )
  })

  it('passes null checkInId when no session exists', async () => {
    vi.mocked(insertActionItem).mockResolvedValue({} as never)
    const params = makeParams({ state: stateNoSession })
    const { result } = renderHook(() => useCheckInMutations(params))

    const input: Omit<ActionItem, 'id' | 'createdAt'> = {
      coupleId: COUPLE_ID,
      checkInId: null,
      title: 'Task',
      description: null,
      assignedTo: null,
      dueDate: null,
      completed: false,
      completedAt: null,
    }

    await act(() => result.current.addActionItem(input))

    expect(insertActionItem).toHaveBeenCalledWith(expect.objectContaining({ checkInId: null }))
  })
})

describe('useCheckInMutations — updateActionItem', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls updateActionItemDb with correct params', async () => {
    vi.mocked(updateActionItemDb).mockResolvedValue({} as never)
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    await act(() => result.current.updateActionItem('ai-1', { title: 'Updated title' }))

    expect(updateActionItemDb).toHaveBeenCalledWith('ai-1', { title: 'Updated title' })
  })
})

describe('useCheckInMutations — removeActionItem', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls deleteActionItem', async () => {
    vi.mocked(deleteActionItem).mockResolvedValue({} as never)
    const params = makeParams()
    const { result } = renderHook(() => useCheckInMutations(params))

    await act(() => result.current.removeActionItem('ai-1'))

    expect(deleteActionItem).toHaveBeenCalledWith('ai-1')
  })
})

describe('useCheckInMutations — toggleActionItem', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls toggleActionItemDb with current completed state', async () => {
    vi.mocked(toggleActionItemDb).mockResolvedValue({} as never)
    const params = makeParams({ actionItems: [fakeActionItem] })
    const { result } = renderHook(() => useCheckInMutations(params))

    await act(() => result.current.toggleActionItem('ai-1'))

    expect(toggleActionItemDb).toHaveBeenCalledWith('ai-1', false)
  })

  it('calls toggleActionItemDb with completed=true for a completed item', async () => {
    vi.mocked(toggleActionItemDb).mockResolvedValue({} as never)
    const completedItem: ActionItem = { ...fakeActionItem, completed: true }
    const params = makeParams({ actionItems: [completedItem] })
    const { result } = renderHook(() => useCheckInMutations(params))

    await act(() => result.current.toggleActionItem('ai-1'))

    expect(toggleActionItemDb).toHaveBeenCalledWith('ai-1', true)
  })

  it('does nothing when the actionItemId is not found', async () => {
    const params = makeParams({ actionItems: [] })
    const { result } = renderHook(() => useCheckInMutations(params))

    await act(() => result.current.toggleActionItem('nonexistent'))

    expect(toggleActionItemDb).not.toHaveBeenCalled()
  })
})
