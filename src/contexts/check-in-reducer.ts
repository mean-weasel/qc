'use client'

import type { CheckIn } from '@/types'
import type { CheckInContextState, CheckInAction, CheckInSession, CheckInStep, CategoryProgress } from '@/types/checkin'

export const STEPS: CheckInStep[] = [
  'welcome',
  'category-selection',
  'warm-up',
  'category-discussion',
  'reflection',
  'action-items',
  'completion',
]

function calculateProgress(completedSteps: CheckInStep[]): number {
  return Math.round((completedSteps.length / STEPS.length) * 100)
}

export function createInitialSession(categories: string[], coupleId: string): CheckInSession {
  const now = new Date().toISOString()
  const baseCheckIn: CheckIn = {
    id: crypto.randomUUID(),
    coupleId,
    startedAt: now,
    completedAt: null,
    status: 'in-progress',
    categories,
    moodBefore: null,
    moodAfter: null,
    reflection: null,
  }

  const categoryProgress: CategoryProgress[] = categories.map((categoryId) => ({
    categoryId,
    isCompleted: false,
    notes: [],
    timeSpent: 0,
    lastUpdated: now,
  }))

  return {
    id: baseCheckIn.id,
    baseCheckIn,
    progress: {
      currentStep: 'welcome',
      completedSteps: [],
      totalSteps: STEPS.length,
      percentage: 0,
    },
    selectedCategories: categories,
    categoryProgress,
    draftNotes: [],
    startedAt: now,
    lastSavedAt: now,
  }
}

function handleCompleteStep(state: CheckInContextState, step: CheckInStep): CheckInContextState {
  if (!state.session) return state
  const completedSteps = [...state.session.progress.completedSteps]
  if (!completedSteps.includes(step)) {
    completedSteps.push(step)
  }
  const currentStepIndex = STEPS.indexOf(state.session.progress.currentStep)
  const nextStep = STEPS[currentStepIndex + 1] || state.session.progress.currentStep
  return {
    ...state,
    session: {
      ...state.session,
      progress: {
        ...state.session.progress,
        completedSteps,
        currentStep: nextStep,
        percentage: calculateProgress(completedSteps),
      },
      lastSavedAt: new Date().toISOString(),
    },
  }
}

function withTimestamp(state: CheckInContextState): CheckInContextState {
  if (!state.session) return state
  return {
    ...state,
    session: { ...state.session, lastSavedAt: new Date().toISOString() },
  }
}

export function checkInReducer(state: CheckInContextState, action: CheckInAction): CheckInContextState {
  switch (action.type) {
    case 'START_CHECKIN':
      return { ...state, isLoading: false, error: null }

    case 'GO_TO_STEP': {
      if (!state.session) return state
      return {
        ...state,
        session: {
          ...state.session,
          progress: { ...state.session.progress, currentStep: action.payload.step },
          lastSavedAt: new Date().toISOString(),
        },
      }
    }

    case 'COMPLETE_STEP':
      return handleCompleteStep(state, action.payload.step)

    case 'SET_CATEGORY_PROGRESS': {
      if (!state.session) return state
      const { categoryId, progress } = action.payload
      return {
        ...state,
        session: {
          ...state.session,
          categoryProgress: state.session.categoryProgress.map((cp) =>
            cp.categoryId === categoryId ? { ...cp, ...progress, lastUpdated: new Date().toISOString() } : cp,
          ),
          lastSavedAt: new Date().toISOString(),
        },
      }
    }

    case 'ADD_DRAFT_NOTE': {
      if (!state.session) return state
      return {
        ...state,
        session: {
          ...state.session,
          draftNotes: [...state.session.draftNotes, action.payload.note],
          lastSavedAt: new Date().toISOString(),
        },
      }
    }

    case 'UPDATE_DRAFT_NOTE': {
      if (!state.session) return state
      const { noteId, updates } = action.payload
      return {
        ...state,
        session: {
          ...state.session,
          draftNotes: state.session.draftNotes.map((note) =>
            note.id === noteId ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note,
          ),
          lastSavedAt: new Date().toISOString(),
        },
      }
    }

    case 'REMOVE_DRAFT_NOTE': {
      if (!state.session) return state
      return {
        ...state,
        session: {
          ...state.session,
          draftNotes: state.session.draftNotes.filter((note) => note.id !== action.payload.noteId),
          lastSavedAt: new Date().toISOString(),
        },
      }
    }

    case 'ADD_ACTION_ITEM':
    case 'UPDATE_ACTION_ITEM':
    case 'REMOVE_ACTION_ITEM':
    case 'TOGGLE_ACTION_ITEM':
      return withTimestamp(state)

    case 'SAVE_SESSION': {
      const timestamped = withTimestamp(state)
      return timestamped.isLoading ? { ...timestamped, isLoading: false } : timestamped
    }

    case 'COMPLETE_CHECKIN':
    case 'ABANDON_CHECKIN':
      return { ...state, session: null }

    case 'RESTORE_SESSION':
      return { ...state, session: action.payload.session, isLoading: false, error: null }

    case 'SET_ERROR':
      return { ...state, error: action.payload.error }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    default:
      return state
  }
}
