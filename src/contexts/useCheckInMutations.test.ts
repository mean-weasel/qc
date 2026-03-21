import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@/lib/checkin-operations', () => ({
  insertCheckIn: vi.fn(),
  updateCheckInStatus: vi.fn(),
  saveDraftMoodReflection: vi.fn(),
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
import { insertCheckIn, updateCheckInStatus } from '@/lib/checkin-operations'
import { createInitialSession } from '@/contexts/check-in-reducer'

const SESSION_ID = 'session-1'
const COUPLE_ID = 'couple-1'
const USER_ID = 'user-1'

const TS = '2026-01-01T00:00:00Z'
const fakeSession = {
  id: SESSION_ID,
  baseCheckIn: {
    id: SESSION_ID,
    coupleId: COUPLE_ID,
    startedAt: TS,
    completedAt: null,
    status: 'in-progress' as const,
    categories: ['communication'],
    moodBefore: null,
    moodAfter: null,
    reflection: null,
  },
  progress: { currentStep: 'welcome' as const, completedSteps: [], totalSteps: 7, percentage: 0 },
  selectedCategories: ['communication'],
  categoryProgress: [],
  draftNotes: [],
  startedAt: TS,
  lastSavedAt: TS,
}

const stateWithSession: CheckInContextState = { session: fakeSession, isLoading: false, error: null }
const stateNoSession: CheckInContextState = { session: null, isLoading: false, error: null }

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
