'use client'

import { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import type { BookendsState, QuickReflection } from '@/types/bookends'
import { createClient } from '@/lib/supabase/client'
import { bookEndsReducer, initialState, loadPrepTopicsFromStorage, savePrepTopicsToStorage } from './bookends-reducer'
import type { PreparationTopic } from '@/types/bookends'

interface BookendsContextValue extends BookendsState {
  addMyTopic: (content: string, isQuickTopic?: boolean) => void
  removeMyTopic: (topicId: string) => void
  reorderMyTopics: (topics: PreparationTopic[]) => void
  clearPreparation: () => void
  openPreparationModal: () => void
  closePreparationModal: () => void
  saveReflection: (reflection: Omit<QuickReflection, 'id' | 'createdAt'>) => void
  openReflectionModal: () => void
  closeReflectionModal: () => void
}

const BookendsContext = createContext<BookendsContextValue | null>(null)

interface BookendsProviderProps {
  children: React.ReactNode
  coupleId: string
  userId: string
}

export function BookendsProvider({ children, coupleId, userId }: BookendsProviderProps): React.ReactNode {
  const [state, dispatch] = useReducer(bookEndsReducer, initialState)

  // Restore preparation topics from localStorage on mount
  useEffect(() => {
    const topics = loadPrepTopicsFromStorage(coupleId)
    if (topics && topics.length > 0) {
      dispatch({
        type: 'LOAD_STATE',
        payload: {
          preparation: {
            id: crypto.randomUUID(),
            myTopics: topics,
            partnerTopics: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      })
    }
  }, [coupleId])

  // Persist preparation topics to localStorage whenever they change
  useEffect(() => {
    savePrepTopicsToStorage(coupleId, state.preparation?.myTopics ?? [])
  }, [coupleId, state.preparation?.myTopics])

  // Load mood data from last completed check-in
  useEffect(() => {
    async function loadReflectionData() {
      const supabase = createClient()
      const { data } = await supabase
        .from('check_ins')
        .select('id, mood_before, mood_after, reflection, completed_at')
        .eq('couple_id', coupleId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data?.reflection) {
        dispatch({
          type: 'LOAD_STATE',
          payload: {
            reflection: {
              id: data.id,
              sessionId: data.id,
              authorId: userId,
              feelingBefore: data.mood_before ?? 3,
              feelingAfter: data.mood_after ?? 4,
              gratitude: data.reflection,
              keyTakeaway: '',
              shareWithPartner: true,
              createdAt: data.completed_at ?? new Date().toISOString(),
            },
          },
        })
      }
    }
    loadReflectionData()
  }, [coupleId, userId])

  const addMyTopic = useCallback(
    (content: string, isQuickTopic = false) => {
      dispatch({ type: 'ADD_MY_TOPIC', payload: { content, isQuickTopic, authorId: userId } })
    },
    [userId],
  )

  const removeMyTopic = useCallback((topicId: string) => {
    dispatch({ type: 'REMOVE_MY_TOPIC', payload: { topicId } })
  }, [])

  const reorderMyTopics = useCallback((topics: PreparationTopic[]) => {
    dispatch({ type: 'REORDER_MY_TOPICS', payload: { topics } })
  }, [])

  const clearPreparation = useCallback(() => {
    dispatch({ type: 'CLEAR_PREPARATION' })
  }, [])

  const openPreparationModal = useCallback(() => {
    dispatch({ type: 'OPEN_PREPARATION_MODAL' })
  }, [])

  const closePreparationModal = useCallback(() => {
    dispatch({ type: 'CLOSE_PREPARATION_MODAL' })
  }, [])

  const saveReflection = useCallback(async (reflection: Omit<QuickReflection, 'id' | 'createdAt'>) => {
    const supabase = createClient()
    // Save mood to the check-in record
    if (reflection.sessionId) {
      await supabase
        .from('check_ins')
        .update({
          mood_before: reflection.feelingBefore,
          mood_after: reflection.feelingAfter,
          reflection: reflection.gratitude,
        })
        .eq('id', reflection.sessionId)
    }
    const fullReflection: QuickReflection = {
      ...reflection,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'SAVE_REFLECTION', payload: fullReflection })
  }, [])

  const openReflectionModal = useCallback(() => {
    dispatch({ type: 'OPEN_REFLECTION_MODAL' })
  }, [])

  const closeReflectionModal = useCallback(() => {
    dispatch({ type: 'CLOSE_REFLECTION_MODAL' })
  }, [])

  const value: BookendsContextValue = {
    ...state,
    addMyTopic,
    removeMyTopic,
    reorderMyTopics,
    clearPreparation,
    openPreparationModal,
    closePreparationModal,
    saveReflection,
    openReflectionModal,
    closeReflectionModal,
  }

  return <BookendsContext.Provider value={value}>{children}</BookendsContext.Provider>
}

export function useBookends(): BookendsContextValue {
  const context = useContext(BookendsContext)
  if (!context) {
    throw new Error('useBookends must be used within BookendsProvider')
  }
  return context
}
