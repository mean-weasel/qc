import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BookendsState, PreparationTopic, QuickReflection, SessionPreparation } from '@/types/bookends'

import { bookEndsReducer, initialState } from './bookends-reducer'

// ---------------------------------------------------------------------------
// Fake timers -- deterministic timestamps
// ---------------------------------------------------------------------------

const BASE_TIME = new Date('2025-06-01T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(BASE_TIME)
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
