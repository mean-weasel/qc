import { describe, it, expect, vi, beforeEach } from 'vitest'
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
import type { ActionItem } from '@/types'
import { insertActionItem, updateActionItemDb, deleteActionItem, toggleActionItemDb } from '@/lib/checkin-operations'

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
  progress: { currentStep: 'welcome' as const, completedSteps: [], totalSteps: 7, percentage: 0 },
  selectedCategories: ['communication'],
  categoryProgress: [],
  draftNotes: [],
  startedAt: '2026-01-01T00:00:00Z',
  lastSavedAt: '2026-01-01T00:00:00Z',
}

const stateWithSession: CheckInContextState = { session: fakeSession, isLoading: false, error: null }
const stateNoSession: CheckInContextState = { session: null, isLoading: false, error: null }

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
      expect.objectContaining({ coupleId: COUPLE_ID, checkInId: SESSION_ID, title: 'Follow up' }),
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
