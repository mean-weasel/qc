import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BookendsState, PreparationTopic, QuickReflection, SessionPreparation } from '@/types/bookends'

import { bookEndsReducer, initialState, loadPrepTopicsFromStorage, savePrepTopicsToStorage } from './bookends-reducer'

// ---------------------------------------------------------------------------
// Fake timers -- deterministic timestamps
// ---------------------------------------------------------------------------

const BASE_TIME = new Date('2025-06-01T12:00:00.000Z')

// ---------------------------------------------------------------------------
// localStorage stub -- jsdom's localStorage may be unavailable in CI;
// stub the global so the helper functions always exercise the storage paths.
// ---------------------------------------------------------------------------

const storageStore: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => storageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storageStore[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete storageStore[key]
  }),
}

vi.stubGlobal('localStorage', localStorageMock)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BASE_TIME)
  // Reset storage and clear call history between tests
  for (const key of Object.keys(storageStore)) {
    delete storageStore[key]
  }
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTopic(overrides: Partial<PreparationTopic> = {}): PreparationTopic {
  return {
    id: 'topic-1',
    content: 'Let us talk finances',
    authorId: 'user-1',
    isQuickTopic: false,
    priority: 0,
    createdAt: BASE_TIME.toISOString(),
    ...overrides,
  }
}

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

// ---------------------------------------------------------------------------
// initialState
// ---------------------------------------------------------------------------

describe('initialState', () => {
  it('has null preparation, reflection, and partnerReflection', () => {
    expect(initialState.preparation).toBeNull()
    expect(initialState.reflection).toBeNull()
    expect(initialState.partnerReflection).toBeNull()
  })

  it('has both modals closed', () => {
    expect(initialState.isPreparationModalOpen).toBe(false)
    expect(initialState.isReflectionModalOpen).toBe(false)
  })

  it('has hasSeenPrepReminder false and reflectionStreak 0', () => {
    expect(initialState.hasSeenPrepReminder).toBe(false)
    expect(initialState.reflectionStreak).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// ADD_MY_TOPIC
// ---------------------------------------------------------------------------

describe('ADD_MY_TOPIC', () => {
  it('creates a new preparation when none exists and adds the topic', () => {
    const state = makeState()
    const next = bookEndsReducer(state, {
      type: 'ADD_MY_TOPIC',
      payload: { content: 'Weekend plans', isQuickTopic: false, authorId: 'user-1' },
    })
    expect(next.preparation).not.toBeNull()
    expect(next.preparation!.myTopics).toHaveLength(1)
    expect(next.preparation!.myTopics[0].content).toBe('Weekend plans')
    expect(next.preparation!.myTopics[0].authorId).toBe('user-1')
    expect(next.preparation!.myTopics[0].isQuickTopic).toBe(false)
  })

  it('appends to existing preparation topics', () => {
    const existing = makeTopic({ id: 'topic-a', content: 'First topic' })
    const state = makeState({ preparation: makePreparation({ myTopics: [existing] }) })
    const next = bookEndsReducer(state, {
      type: 'ADD_MY_TOPIC',
      payload: { content: 'Second topic', isQuickTopic: true, authorId: 'user-1' },
    })
    expect(next.preparation!.myTopics).toHaveLength(2)
    expect(next.preparation!.myTopics[1].content).toBe('Second topic')
    expect(next.preparation!.myTopics[1].isQuickTopic).toBe(true)
  })

  it('sets topic priority equal to the current topic count', () => {
    const t1 = makeTopic({ id: 'topic-a' })
    const t2 = makeTopic({ id: 'topic-b' })
    const state = makeState({ preparation: makePreparation({ myTopics: [t1, t2] }) })
    const next = bookEndsReducer(state, {
      type: 'ADD_MY_TOPIC',
      payload: { content: 'Third', isQuickTopic: false, authorId: 'user-1' },
    })
    expect(next.preparation!.myTopics[2].priority).toBe(2)
  })

  it('assigns a string id to the new topic', () => {
    const state = makeState()
    const next = bookEndsReducer(state, {
      type: 'ADD_MY_TOPIC',
      payload: { content: 'Topic', isQuickTopic: false, authorId: 'user-1' },
    })
    expect(typeof next.preparation!.myTopics[0].id).toBe('string')
    expect(next.preparation!.myTopics[0].id.length).toBeGreaterThan(0)
  })

  it('preserves partnerTopics on the preparation', () => {
    const partnerTopic = makeTopic({ id: 'partner-topic-1' })
    const state = makeState({ preparation: makePreparation({ partnerTopics: [partnerTopic] }) })
    const next = bookEndsReducer(state, {
      type: 'ADD_MY_TOPIC',
      payload: { content: 'My topic', isQuickTopic: false, authorId: 'user-1' },
    })
    expect(next.preparation!.partnerTopics).toHaveLength(1)
    expect(next.preparation!.partnerTopics[0].id).toBe('partner-topic-1')
  })
})

// ---------------------------------------------------------------------------
// REMOVE_MY_TOPIC
// ---------------------------------------------------------------------------

describe('REMOVE_MY_TOPIC', () => {
  it('removes the topic matching the given id', () => {
    const t1 = makeTopic({ id: 'topic-a', content: 'First' })
    const t2 = makeTopic({ id: 'topic-b', content: 'Second' })
    const state = makeState({ preparation: makePreparation({ myTopics: [t1, t2] }) })
    const next = bookEndsReducer(state, { type: 'REMOVE_MY_TOPIC', payload: { topicId: 'topic-a' } })
    expect(next.preparation!.myTopics).toHaveLength(1)
    expect(next.preparation!.myTopics[0].id).toBe('topic-b')
  })

  it('is a no-op when preparation is null', () => {
    const state = makeState()
    const next = bookEndsReducer(state, { type: 'REMOVE_MY_TOPIC', payload: { topicId: 'topic-x' } })
    expect(next).toBe(state)
  })

  it('leaves the list unchanged when the id does not match any topic', () => {
    const t1 = makeTopic({ id: 'topic-a' })
    const state = makeState({ preparation: makePreparation({ myTopics: [t1] }) })
    const next = bookEndsReducer(state, { type: 'REMOVE_MY_TOPIC', payload: { topicId: 'nonexistent' } })
    expect(next.preparation!.myTopics).toHaveLength(1)
  })

  it('updates updatedAt on the preparation', () => {
    const t1 = makeTopic({ id: 'topic-a' })
    const original = BASE_TIME.toISOString()
    const state = makeState({ preparation: makePreparation({ myTopics: [t1], updatedAt: original }) })
    vi.advanceTimersByTime(1000)
    const next = bookEndsReducer(state, { type: 'REMOVE_MY_TOPIC', payload: { topicId: 'topic-a' } })
    expect(next.preparation!.updatedAt).not.toBe(original)
  })
})

// ---------------------------------------------------------------------------
// REORDER_MY_TOPICS
// ---------------------------------------------------------------------------

describe('REORDER_MY_TOPICS', () => {
  it('replaces myTopics with the supplied array', () => {
    const t1 = makeTopic({ id: 'topic-a' })
    const t2 = makeTopic({ id: 'topic-b' })
    const state = makeState({ preparation: makePreparation({ myTopics: [t1, t2] }) })
    const reordered = [t2, t1]
    const next = bookEndsReducer(state, { type: 'REORDER_MY_TOPICS', payload: { topics: reordered } })
    expect(next.preparation!.myTopics[0].id).toBe('topic-b')
    expect(next.preparation!.myTopics[1].id).toBe('topic-a')
  })

  it('is a no-op when preparation is null', () => {
    const state = makeState()
    const next = bookEndsReducer(state, { type: 'REORDER_MY_TOPICS', payload: { topics: [] } })
    expect(next).toBe(state)
  })

  it('updates updatedAt on the preparation', () => {
    const t1 = makeTopic({ id: 'topic-a' })
    const original = BASE_TIME.toISOString()
    const state = makeState({ preparation: makePreparation({ myTopics: [t1], updatedAt: original }) })
    vi.advanceTimersByTime(1000)
    const next = bookEndsReducer(state, { type: 'REORDER_MY_TOPICS', payload: { topics: [t1] } })
    expect(next.preparation!.updatedAt).not.toBe(original)
  })
})

// ---------------------------------------------------------------------------
// SET_PARTNER_TOPICS
// ---------------------------------------------------------------------------

describe('SET_PARTNER_TOPICS', () => {
  it('sets partnerTopics on an existing preparation', () => {
    const state = makeState({ preparation: makePreparation() })
    const topics = [makeTopic({ id: 'partner-1' })]
    const next = bookEndsReducer(state, { type: 'SET_PARTNER_TOPICS', payload: { topics } })
    expect(next.preparation!.partnerTopics).toHaveLength(1)
    expect(next.preparation!.partnerTopics[0].id).toBe('partner-1')
  })

  it('creates a new preparation when none exists and sets partnerTopics', () => {
    const state = makeState()
    const topics = [makeTopic({ id: 'partner-1' })]
    const next = bookEndsReducer(state, { type: 'SET_PARTNER_TOPICS', payload: { topics } })
    expect(next.preparation).not.toBeNull()
    expect(next.preparation!.partnerTopics).toHaveLength(1)
    expect(next.preparation!.myTopics).toHaveLength(0)
  })

  it('preserves existing myTopics', () => {
    const myTopic = makeTopic({ id: 'my-1' })
    const state = makeState({ preparation: makePreparation({ myTopics: [myTopic] }) })
    const next = bookEndsReducer(state, { type: 'SET_PARTNER_TOPICS', payload: { topics: [] } })
    expect(next.preparation!.myTopics).toHaveLength(1)
  })

  it('updates updatedAt', () => {
    const original = BASE_TIME.toISOString()
    const state = makeState({ preparation: makePreparation({ updatedAt: original }) })
    vi.advanceTimersByTime(1000)
    const next = bookEndsReducer(state, { type: 'SET_PARTNER_TOPICS', payload: { topics: [] } })
    expect(next.preparation!.updatedAt).not.toBe(original)
  })
})

// ---------------------------------------------------------------------------
// CLEAR_PREPARATION
// ---------------------------------------------------------------------------

describe('CLEAR_PREPARATION', () => {
  it('sets preparation to null', () => {
    const state = makeState({ preparation: makePreparation() })
    const next = bookEndsReducer(state, { type: 'CLEAR_PREPARATION' })
    expect(next.preparation).toBeNull()
  })

  it('leaves other state fields unchanged', () => {
    const reflection = makeReflection()
    const state = makeState({ preparation: makePreparation(), reflection, hasSeenPrepReminder: true })
    const next = bookEndsReducer(state, { type: 'CLEAR_PREPARATION' })
    expect(next.reflection).toBe(reflection)
    expect(next.hasSeenPrepReminder).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// SAVE_REFLECTION
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// SET_PARTNER_REFLECTION
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// OPEN_PREPARATION_MODAL / CLOSE_PREPARATION_MODAL
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// OPEN_REFLECTION_MODAL / CLOSE_REFLECTION_MODAL
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// MARK_PREP_REMINDER_SEEN
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// LOAD_STATE
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// loadPrepTopicsFromStorage
// ---------------------------------------------------------------------------

describe('loadPrepTopicsFromStorage', () => {
  it('returns null when localStorage has no entry for the couple', () => {
    expect(loadPrepTopicsFromStorage('couple-1')).toBeNull()
  })

  it('parses and returns stored topics', () => {
    const topics: PreparationTopic[] = [makeTopic({ id: 'stored-topic' })]
    storageStore['qc-prep-topics-couple-1'] = JSON.stringify(topics)
    const result = loadPrepTopicsFromStorage('couple-1')
    expect(result).toEqual(topics)
  })

  it('uses a storage key that includes the coupleId', () => {
    loadPrepTopicsFromStorage('couple-abc')
    expect(localStorageMock.getItem).toHaveBeenCalledWith(expect.stringContaining('couple-abc'))
  })

  it('returns null when JSON.parse throws', () => {
    localStorageMock.getItem.mockReturnValueOnce('not-valid-json{')
    expect(loadPrepTopicsFromStorage('couple-1')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// savePrepTopicsToStorage
// ---------------------------------------------------------------------------

describe('savePrepTopicsToStorage', () => {
  it('calls localStorage.setItem with serialised topics when topics are non-empty', () => {
    const topics: PreparationTopic[] = [makeTopic({ id: 'save-me' })]
    savePrepTopicsToStorage('couple-1', topics)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(expect.stringContaining('couple-1'), JSON.stringify(topics))
  })

  it('calls localStorage.removeItem when topics array is empty', () => {
    savePrepTopicsToStorage('couple-1', [])
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(expect.stringContaining('couple-1'))
  })

  it('uses a storage key that includes the coupleId', () => {
    savePrepTopicsToStorage('couple-xyz', [makeTopic()])
    expect(localStorageMock.setItem).toHaveBeenCalledWith(expect.stringContaining('couple-xyz'), expect.any(String))
  })

  it('does not throw when localStorage.setItem throws', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => savePrepTopicsToStorage('couple-1', [makeTopic()])).not.toThrow()
  })
})
