'use client'

import { createContext, useContext, useReducer, useCallback, useEffect, useState, useMemo } from 'react'
import type { ActionItem, DbCheckIn, DbActionItem } from '@/types'
import type { CheckInContextValue, CheckInContextState, CheckInStep } from '@/types/checkin'
import { useRealtimeCouple } from '@/hooks/useRealtimeCouple'
import { checkInReducer, createInitialSession, STEPS } from './check-in-reducer'
import { mapDbActionItem, fetchActiveCheckIn, fetchCheckInActionItems } from '@/lib/checkin-operations'
import { useCheckInMutations } from './useCheckInMutations'

const CheckInContext = createContext<CheckInContextValue | null>(null)

interface CheckInProviderProps {
  children: React.ReactNode
  coupleId: string
  userId: string
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
