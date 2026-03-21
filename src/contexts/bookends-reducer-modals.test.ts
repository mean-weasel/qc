import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BookendsState, QuickReflection, SessionPreparation } from '@/types/bookends'

import { bookEndsReducer, initialState } from './bookends-reducer'

const BASE_TIME = new Date('2025-06-01T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BASE_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

function makePreparation(overrides: Partial<SessionPreparation> = {}): SessionPreparation {
  return {
    id: 'prep-1',
    myTopics: [],
    partnerTopics: [],
    createdAt: BASE_TIME.toISOString(),
    updatedAt: BASE_TIME.toISOString(),
    ...overrides,
  }
}

function makeReflection(overrides: Partial<QuickReflection> = {}): QuickReflection {
  return {
    id: 'reflection-1',
    sessionId: 'session-1',
    authorId: 'user-1',
    feelingBefore: 3,
    feelingAfter: 4,
    gratitude: 'I appreciate you',
    keyTakeaway: 'Communication is key',
    shareWithPartner: true,
    createdAt: BASE_TIME.toISOString(),
    ...overrides,
  }
}

function makeState(overrides: Partial<BookendsState> = {}): BookendsState {
  return { ...initialState, ...overrides }
}

describe('SAVE_REFLECTION', () => {
  it('saves the reflection to state', () => {
    const reflection = makeReflection()
    const state = makeState()
    const next = bookEndsReducer(state, { type: 'SAVE_REFLECTION', payload: reflection })
    expect(next.reflection).toEqual(reflection)
  })

  it('increments reflectionStreak by 1', () => {
    const reflection = makeReflection()
    const state = makeState({ reflectionStreak: 3 })
    const next = bookEndsReducer(state, { type: 'SAVE_REFLECTION', payload: reflection })
    expect(next.reflectionStreak).toBe(4)
  })

  it('starts streak at 1 when previously 0', () => {
    const reflection = makeReflection()
    const state = makeState({ reflectionStreak: 0 })
    const next = bookEndsReducer(state, { type: 'SAVE_REFLECTION', payload: reflection })
    expect(next.reflectionStreak).toBe(1)
  })
})

describe('SET_PARTNER_REFLECTION', () => {
  it('stores the partner reflection', () => {
    const reflection = makeReflection({ id: 'partner-reflection-1', authorId: 'user-2' })
    const state = makeState()
    const next = bookEndsReducer(state, { type: 'SET_PARTNER_REFLECTION', payload: reflection })
    expect(next.partnerReflection).toEqual(reflection)
  })

  it('does not affect the user reflection or streak', () => {
    const userReflection = makeReflection({ id: 'mine' })
    const partnerReflection = makeReflection({ id: 'theirs' })
    const state = makeState({ reflection: userReflection, reflectionStreak: 2 })
    const next = bookEndsReducer(state, { type: 'SET_PARTNER_REFLECTION', payload: partnerReflection })
    expect(next.reflection).toEqual(userReflection)
    expect(next.reflectionStreak).toBe(2)
  })
})

describe('OPEN_PREPARATION_MODAL', () => {
  it('sets isPreparationModalOpen to true', () => {
    const state = makeState({ isPreparationModalOpen: false })
    const next = bookEndsReducer(state, { type: 'OPEN_PREPARATION_MODAL' })
    expect(next.isPreparationModalOpen).toBe(true)
  })

  it('does not affect isReflectionModalOpen', () => {
    const state = makeState({ isPreparationModalOpen: false, isReflectionModalOpen: true })
    const next = bookEndsReducer(state, { type: 'OPEN_PREPARATION_MODAL' })
    expect(next.isReflectionModalOpen).toBe(true)
  })
})

describe('CLOSE_PREPARATION_MODAL', () => {
  it('sets isPreparationModalOpen to false', () => {
    const state = makeState({ isPreparationModalOpen: true })
    const next = bookEndsReducer(state, { type: 'CLOSE_PREPARATION_MODAL' })
    expect(next.isPreparationModalOpen).toBe(false)
  })
})

describe('OPEN_REFLECTION_MODAL', () => {
  it('sets isReflectionModalOpen to true', () => {
    const state = makeState({ isReflectionModalOpen: false })
    const next = bookEndsReducer(state, { type: 'OPEN_REFLECTION_MODAL' })
    expect(next.isReflectionModalOpen).toBe(true)
  })

  it('clears any existing reflection when opening', () => {
    const reflection = makeReflection()
    const state = makeState({ reflection, isReflectionModalOpen: false })
    const next = bookEndsReducer(state, { type: 'OPEN_REFLECTION_MODAL' })
    expect(next.reflection).toBeNull()
  })

  it('does not affect isPreparationModalOpen', () => {
    const state = makeState({ isPreparationModalOpen: true, isReflectionModalOpen: false })
    const next = bookEndsReducer(state, { type: 'OPEN_REFLECTION_MODAL' })
    expect(next.isPreparationModalOpen).toBe(true)
  })
})

describe('CLOSE_REFLECTION_MODAL', () => {
  it('sets isReflectionModalOpen to false', () => {
    const state = makeState({ isReflectionModalOpen: true })
    const next = bookEndsReducer(state, { type: 'CLOSE_REFLECTION_MODAL' })
    expect(next.isReflectionModalOpen).toBe(false)
  })

  it('does not clear an existing reflection when closing', () => {
    const reflection = makeReflection()
    const state = makeState({ reflection, isReflectionModalOpen: true })
    const next = bookEndsReducer(state, { type: 'CLOSE_REFLECTION_MODAL' })
    expect(next.reflection).toEqual(reflection)
  })
})

describe('MARK_PREP_REMINDER_SEEN', () => {
  it('sets hasSeenPrepReminder to true', () => {
    const state = makeState({ hasSeenPrepReminder: false })
    const next = bookEndsReducer(state, { type: 'MARK_PREP_REMINDER_SEEN' })
    expect(next.hasSeenPrepReminder).toBe(true)
  })

  it('is idempotent when already true', () => {
    const state = makeState({ hasSeenPrepReminder: true })
    const next = bookEndsReducer(state, { type: 'MARK_PREP_REMINDER_SEEN' })
    expect(next.hasSeenPrepReminder).toBe(true)
  })
})

describe('LOAD_STATE', () => {
  it('merges partial state into current state', () => {
    const state = makeState({ reflectionStreak: 0, hasSeenPrepReminder: false })
    const next = bookEndsReducer(state, {
      type: 'LOAD_STATE',
      payload: { reflectionStreak: 5, hasSeenPrepReminder: true },
    })
    expect(next.reflectionStreak).toBe(5)
    expect(next.hasSeenPrepReminder).toBe(true)
  })

  it('preserves fields not included in the payload', () => {
    const reflection = makeReflection()
    const state = makeState({ reflection, reflectionStreak: 3 })
    const next = bookEndsReducer(state, { type: 'LOAD_STATE', payload: { reflectionStreak: 7 } })
    expect(next.reflection).toEqual(reflection)
  })

  it('can load a preparation via payload', () => {
    const state = makeState()
    const prep = makePreparation()
    const next = bookEndsReducer(state, { type: 'LOAD_STATE', payload: { preparation: prep } })
    expect(next.preparation).toEqual(prep)
  })

  it('handles empty payload without changing state fields', () => {
    const state = makeState({ reflectionStreak: 2 })
    const next = bookEndsReducer(state, { type: 'LOAD_STATE', payload: {} })
    expect(next.reflectionStreak).toBe(2)
  })
})

describe('reducer immutability', () => {
  it('returns a new object reference on every state change', () => {
    const state = makeState()
    const next = bookEndsReducer(state, { type: 'MARK_PREP_REMINDER_SEEN' })
    expect(next).not.toBe(state)
  })

  it('returns the same reference when REMOVE_MY_TOPIC is a no-op (null preparation)', () => {
    const state = makeState()
    const next = bookEndsReducer(state, { type: 'REMOVE_MY_TOPIC', payload: { topicId: 'x' } })
    expect(next).toBe(state)
  })
})
