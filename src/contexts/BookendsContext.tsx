'use client'

import { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import type { BookendsState, QuickReflection, PreparationTopic } from '@/types/bookends'
import { createClient } from '@/lib/supabase/client'

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

type BookendsAction =
  | { type: 'ADD_MY_TOPIC'; payload: { content: string; isQuickTopic: boolean; authorId: string } }
  | { type: 'REMOVE_MY_TOPIC'; payload: { topicId: string } }
  | { type: 'REORDER_MY_TOPICS'; payload: { topics: PreparationTopic[] } }
  | { type: 'SET_PARTNER_TOPICS'; payload: { topics: PreparationTopic[] } }
  | { type: 'CLEAR_PREPARATION' }
  | { type: 'SAVE_REFLECTION'; payload: QuickReflection }
  | { type: 'SET_PARTNER_REFLECTION'; payload: QuickReflection }
  | { type: 'OPEN_PREPARATION_MODAL' }
  | { type: 'CLOSE_PREPARATION_MODAL' }
  | { type: 'OPEN_REFLECTION_MODAL' }
  | { type: 'CLOSE_REFLECTION_MODAL' }
  | { type: 'MARK_PREP_REMINDER_SEEN' }
  | { type: 'LOAD_STATE'; payload: Partial<BookendsState> }

const initialState: BookendsState = {
  preparation: null,
  reflection: null,
  partnerReflection: null,
  isPreparationModalOpen: false,
  isReflectionModalOpen: false,
  hasSeenPrepReminder: false,
  reflectionStreak: 0,
}

function bookEndsReducer(state: BookendsState, action: BookendsAction): BookendsState {
  switch (action.type) {
    case 'ADD_MY_TOPIC': {
      const newTopic: PreparationTopic = {
        id: crypto.randomUUID(),
        content: action.payload.content,
        authorId: action.payload.authorId,
        isQuickTopic: action.payload.isQuickTopic,
        priority: state.preparation?.myTopics.length || 0,
        createdAt: new Date().toISOString(),
      }
      const preparation = state.preparation || {
        id: crypto.randomUUID(),
        myTopics: [],
        partnerTopics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return {
        ...state,
        preparation: {
          ...preparation,
          myTopics: [...preparation.myTopics, newTopic],
          updatedAt: new Date().toISOString(),
        },
      }
    }

    case 'REMOVE_MY_TOPIC': {
      if (!state.preparation) return state
      return {
        ...state,
        preparation: {
          ...state.preparation,
          myTopics: state.preparation.myTopics.filter((t) => t.id !== action.payload.topicId),
          updatedAt: new Date().toISOString(),
        },
      }
    }

    case 'REORDER_MY_TOPICS': {
      if (!state.preparation) return state
      return {
        ...state,
        preparation: {
          ...state.preparation,
          myTopics: action.payload.topics,
          updatedAt: new Date().toISOString(),
        },
      }
    }

    case 'SET_PARTNER_TOPICS': {
      const preparation = state.preparation || {
        id: crypto.randomUUID(),
        myTopics: [],
        partnerTopics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return {
        ...state,
        preparation: { ...preparation, partnerTopics: action.payload.topics, updatedAt: new Date().toISOString() },
      }
    }

    case 'CLEAR_PREPARATION':
      return { ...state, preparation: null }
    case 'SAVE_REFLECTION':
      return { ...state, reflection: action.payload, reflectionStreak: state.reflectionStreak + 1 }
    case 'SET_PARTNER_REFLECTION':
      return { ...state, partnerReflection: action.payload }
    case 'OPEN_PREPARATION_MODAL':
      return { ...state, isPreparationModalOpen: true }
    case 'CLOSE_PREPARATION_MODAL':
      return { ...state, isPreparationModalOpen: false }
    case 'OPEN_REFLECTION_MODAL':
      return { ...state, isReflectionModalOpen: true, reflection: null }
    case 'CLOSE_REFLECTION_MODAL':
      return { ...state, isReflectionModalOpen: false }
    case 'MARK_PREP_REMINDER_SEEN':
      return { ...state, hasSeenPrepReminder: true }
    case 'LOAD_STATE':
      return { ...state, ...action.payload }
    default:
      return state
  }
}

const BookendsContext = createContext<BookendsContextValue | null>(null)

function getPrepStorageKey(coupleId: string): string {
  return `qc-prep-topics-${coupleId}`
}

function loadPrepTopicsFromStorage(coupleId: string): PreparationTopic[] | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(getPrepStorageKey(coupleId))
    if (!stored) return null
    return JSON.parse(stored) as PreparationTopic[]
  } catch {
    return null
  }
}

function savePrepTopicsToStorage(coupleId: string, topics: PreparationTopic[]): void {
  if (typeof window === 'undefined') return
  try {
    if (topics.length === 0) {
      localStorage.removeItem(getPrepStorageKey(coupleId))
    } else {
      localStorage.setItem(getPrepStorageKey(coupleId), JSON.stringify(topics))
    }
  } catch {
    // localStorage unavailable (private browsing) — ignore
  }
}

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
