'use client'

import { createContext, useContext, useReducer, useCallback, useEffect, useState, useMemo, useRef } from 'react'
import type { Note, ActionItem, DbCheckIn, DbActionItem } from '@/types'
import type {
  CheckInContextValue,
  CheckInContextState,
  CheckInAction,
  CheckInStep,
  CategoryProgress,
} from '@/types/checkin'
import { useRealtimeCouple } from '@/hooks/useRealtimeCouple'
import { checkInReducer, createInitialSession, STEPS } from './check-in-reducer'
import {
  mapDbActionItem,
  fetchActiveCheckIn,
  fetchCheckInActionItems,
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

const CheckInContext = createContext<CheckInContextValue | null>(null)

interface CheckInProviderProps {
  children: React.ReactNode
  coupleId: string
  userId: string
}

interface UseCheckInMutationsParams {
  state: CheckInContextState
  dispatch: React.Dispatch<CheckInAction>
  coupleId: string
  userId: string
  actionItems: ActionItem[]
}

function useCheckInMutations({ state, dispatch, coupleId, userId, actionItems }: UseCheckInMutationsParams) {
  const isStartingRef = useRef(false)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), [dispatch])

  const saveMoodDraft = useCallback(
    (moodBefore: number | null, moodAfter: number | null, reflection: string | null) => {
      if (!state.session) return
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      draftTimerRef.current = setTimeout(async () => {
        if (!state.session) return
        await saveDraftMoodReflection(state.session.id, moodBefore, moodAfter, reflection)
      }, 5000)
    },
    [state.session],
  )

  const startCheckIn = useCallback(
    async (categories: string[]) => {
      if (isStartingRef.current || state.session) return
      isStartingRef.current = true
      dispatch({ type: 'CLEAR_ERROR' })
      const session = createInitialSession(categories, coupleId)
      const { data, error } = await insertCheckIn(session.id, coupleId, session.startedAt, categories)
      isStartingRef.current = false
      if (error) {
        console.error('Failed to start check-in:', error)
        dispatch({ type: 'SET_ERROR', payload: { error: 'Couldn\u2019t start check-in. Please try again.' } })
        return
      }
      session.id = data.id
      session.baseCheckIn.id = data.id
      dispatch({ type: 'RESTORE_SESSION', payload: { session } })
    },
    [coupleId, state.session, dispatch],
  )

  const goToStep = useCallback((step: CheckInStep) => dispatch({ type: 'GO_TO_STEP', payload: { step } }), [dispatch])

  const completeStep = useCallback(
    (step: CheckInStep) => dispatch({ type: 'COMPLETE_STEP', payload: { step } }),
    [dispatch],
  )

  const updateCategoryProgress = useCallback(
    (categoryId: string, progress: Partial<CategoryProgress>) => {
      dispatch({ type: 'SET_CATEGORY_PROGRESS', payload: { categoryId, progress } })
    },
    [dispatch],
  )

  const addDraftNote = useCallback(
    async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await insertNote({
        coupleId,
        authorId: userId,
        checkInId: state.session?.id ?? null,
        content: note.content,
        privacy: note.privacy || 'draft',
        tags: note.tags || [],
        categoryId: note.categoryId ?? null,
      })
      if (error) {
        console.error('Failed to add note:', error)
        dispatch({ type: 'SET_ERROR', payload: { error: 'Couldn\u2019t save note. Please try again.' } })
        return
      }
      const newNote: Note = {
        id: data.id,
        coupleId: data.couple_id,
        authorId: data.author_id,
        checkInId: data.check_in_id,
        content: data.content,
        privacy: data.privacy,
        tags: data.tags || [],
        categoryId: data.category_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
      dispatch({ type: 'ADD_DRAFT_NOTE', payload: { note: newNote } })
    },
    [coupleId, userId, state.session?.id, dispatch],
  )

  const updateDraftNote = useCallback(
    async (noteId: string, updates: Partial<Note>) => {
      await updateNote(noteId, updates)
      dispatch({ type: 'UPDATE_DRAFT_NOTE', payload: { noteId, updates } })
    },
    [dispatch],
  )

  const removeDraftNote = useCallback(
    async (noteId: string) => {
      await deleteNote(noteId)
      dispatch({ type: 'REMOVE_DRAFT_NOTE', payload: { noteId } })
    },
    [dispatch],
  )

  const addActionItem = useCallback(
    async (actionItem: Omit<ActionItem, 'id' | 'createdAt'>) => {
      await insertActionItem({
        coupleId,
        checkInId: state.session?.id ?? null,
        title: actionItem.title,
        description: actionItem.description ?? null,
        assignedTo: actionItem.assignedTo ?? null,
        dueDate: actionItem.dueDate ?? null,
      })
    },
    [coupleId, state.session?.id],
  )

  const updateActionItem = useCallback(async (actionItemId: string, updates: Partial<ActionItem>) => {
    await updateActionItemDb(actionItemId, updates)
  }, [])

  const removeActionItem = useCallback(async (id: string) => deleteActionItem(id), [])

  const toggleActionItem = useCallback(
    async (actionItemId: string) => {
      const item = actionItems.find((i) => i.id === actionItemId)
      if (!item) return
      await toggleActionItemDb(actionItemId, item.completed)
    },
    [actionItems],
  )

  const saveSession = useCallback(() => dispatch({ type: 'SAVE_SESSION' }), [dispatch])

  const completeCheckIn = useCallback(async (): Promise<boolean> => {
    if (!state.session) return false
    dispatch({ type: 'CLEAR_ERROR' })
    const { error } = await updateCheckInStatus(state.session.id, 'completed')
    if (error) {
      console.error('Failed to complete check-in:', error)
      dispatch({
        type: 'SET_ERROR',
        payload: { error: 'Couldn\u2019t save your check-in. Your data is preserved \u2014 please try again.' },
      })
      return false
    }
    dispatch({ type: 'COMPLETE_CHECKIN' })

    // Send summary email (non-blocking)
    if (typeof window !== 'undefined') {
      import('@/app/(app)/checkin/actions').then((m) => m.sendCheckInSummaryEmail(state.session!.id)).catch(() => {})
    }
    return true
  }, [state.session, dispatch])

  const abandonCheckIn = useCallback(async (): Promise<boolean> => {
    if (!state.session) return false
    const { error } = await updateCheckInStatus(state.session.id, 'abandoned')
    if (error) {
      console.error('Failed to abandon check-in:', error)
      dispatch({ type: 'SET_ERROR', payload: { error: 'Couldn\u2019t end the session. Please try again.' } })
      return false
    }
    dispatch({ type: 'ABANDON_CHECKIN' })
    return true
  }, [state.session, dispatch])

  return {
    clearError,
    saveMoodDraft,
    startCheckIn,
    goToStep,
    completeStep,
    updateCategoryProgress,
    addDraftNote,
    updateDraftNote,
    removeDraftNote,
    addActionItem,
    updateActionItem,
    removeActionItem,
    toggleActionItem,
    saveSession,
    completeCheckIn,
    abandonCheckIn,
  }
}

function useCheckInQueries(session: CheckInContextState['session']) {
  const canGoToStep = useCallback(
    (step: CheckInStep) => {
      if (!session) return false
      const stepIndex = STEPS.indexOf(step)
      const currentIndex = STEPS.indexOf(session.progress.currentStep)
      return stepIndex <= currentIndex + 1
    },
    [session],
  )

  const getStepIndex = useCallback((step: CheckInStep) => STEPS.indexOf(step), [])

  const isStepCompleted = useCallback(
    (step: CheckInStep) => {
      if (!session) return false
      return session.progress.completedSteps.includes(step)
    },
    [session],
  )

  const getCurrentCategoryProgress = useCallback(() => {
    if (!session || session.progress.currentStep !== 'category-discussion') return undefined
    return session.categoryProgress.find((cp) => !cp.isCompleted)
  }, [session])

  return { canGoToStep, getStepIndex, isStepCompleted, getCurrentCategoryProgress }
}

export function CheckInProvider({ children, coupleId, userId }: CheckInProviderProps): React.ReactNode {
  const [state, dispatch] = useReducer(checkInReducer, {
    session: null,
    isLoading: true,
    error: null,
  })
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  useEffect(() => {
    async function loadActiveCheckIn() {
      const { data, error } = await fetchActiveCheckIn(coupleId)
      if (error) {
        console.error('Failed to load active check-in:', error)
        dispatch({ type: 'SET_ERROR', payload: { error: 'Couldn\u2019t load your check-in session.' } })
        dispatch({ type: 'SAVE_SESSION' })
        return
      }
      if (data) {
        const session = createInitialSession(data.categories || [], coupleId)
        session.id = data.id
        session.baseCheckIn.id = data.id
        session.baseCheckIn.startedAt = data.started_at
        session.baseCheckIn.moodBefore = data.mood_before
        session.baseCheckIn.moodAfter = data.mood_after
        session.baseCheckIn.reflection = data.reflection
        session.startedAt = data.started_at
        const { data: items } = await fetchCheckInActionItems(data.id, coupleId)
        if (items) setActionItems(items.map(mapDbActionItem))
        dispatch({ type: 'RESTORE_SESSION', payload: { session } })
      } else {
        dispatch({ type: 'SAVE_SESSION' })
      }
    }
    loadActiveCheckIn()
  }, [coupleId])

  useRealtimeCouple<DbCheckIn>({
    table: 'check_ins',
    coupleId,
    onUpdate: useCallback(
      (record: DbCheckIn) => {
        if (record.status !== 'in-progress') dispatch({ type: 'COMPLETE_CHECKIN' })
      },
      [dispatch],
    ),
  })
  useRealtimeCouple<DbActionItem>({
    table: 'action_items',
    coupleId,
    onInsert: useCallback((r: DbActionItem) => setActionItems((p) => [...p, mapDbActionItem(r)]), []),
    onUpdate: useCallback(
      (r: DbActionItem) => setActionItems((p) => p.map((i) => (i.id === r.id ? mapDbActionItem(r) : i))),
      [],
    ),
    onDelete: useCallback((r: DbActionItem) => setActionItems((p) => p.filter((i) => i.id !== r.id)), []),
  })

  const mutations = useCheckInMutations({ state, dispatch, coupleId, userId, actionItems })
  const queries = useCheckInQueries(state.session)
  const contextValue: CheckInContextValue = useMemo(
    () => ({
      ...state,
      coupleId,
      actionItems,
      dispatch,
      ...mutations,
      ...queries,
    }),
    [state, coupleId, actionItems, dispatch, mutations, queries],
  )

  return <CheckInContext.Provider value={contextValue}>{children}</CheckInContext.Provider>
}

export function useCheckInContext(): CheckInContextValue {
  const context = useContext(CheckInContext)
  if (!context) {
    throw new Error('useCheckInContext must be used within a CheckInProvider')
  }
  return context
}
