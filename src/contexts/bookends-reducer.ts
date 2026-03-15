import type { BookendsState, PreparationTopic } from '@/types/bookends'

export type BookendsAction =
  | { type: 'ADD_MY_TOPIC'; payload: { content: string; isQuickTopic: boolean; authorId: string } }
  | { type: 'REMOVE_MY_TOPIC'; payload: { topicId: string } }
  | { type: 'REORDER_MY_TOPICS'; payload: { topics: PreparationTopic[] } }
  | { type: 'SET_PARTNER_TOPICS'; payload: { topics: PreparationTopic[] } }
  | { type: 'CLEAR_PREPARATION' }
  | { type: 'SAVE_REFLECTION'; payload: import('@/types/bookends').QuickReflection }
  | { type: 'SET_PARTNER_REFLECTION'; payload: import('@/types/bookends').QuickReflection }
  | { type: 'OPEN_PREPARATION_MODAL' }
  | { type: 'CLOSE_PREPARATION_MODAL' }
  | { type: 'OPEN_REFLECTION_MODAL' }
  | { type: 'CLOSE_REFLECTION_MODAL' }
  | { type: 'MARK_PREP_REMINDER_SEEN' }
  | { type: 'LOAD_STATE'; payload: Partial<BookendsState> }

export const initialState: BookendsState = {
  preparation: null,
  reflection: null,
  partnerReflection: null,
  isPreparationModalOpen: false,
  isReflectionModalOpen: false,
  hasSeenPrepReminder: false,
  reflectionStreak: 0,
}

function createNewPreparation(myTopics: PreparationTopic[] = []) {
  return {
    id: crypto.randomUUID(),
    myTopics,
    partnerTopics: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function bookEndsReducer(state: BookendsState, action: BookendsAction): BookendsState {
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
      const preparation = state.preparation || createNewPreparation()
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
      const preparation = state.preparation || createNewPreparation()
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

function getPrepStorageKey(coupleId: string): string {
  return `qc-prep-topics-${coupleId}`
}

export function loadPrepTopicsFromStorage(coupleId: string): PreparationTopic[] | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(getPrepStorageKey(coupleId))
    if (!stored) return null
    return JSON.parse(stored) as PreparationTopic[]
  } catch {
    return null
  }
}

export function savePrepTopicsToStorage(coupleId: string, topics: PreparationTopic[]): void {
  if (typeof window === 'undefined') return
  try {
    if (topics.length === 0) {
      localStorage.removeItem(getPrepStorageKey(coupleId))
    } else {
      localStorage.setItem(getPrepStorageKey(coupleId), JSON.stringify(topics))
    }
  } catch {
    // localStorage unavailable (private browsing) -- ignore
  }
}
