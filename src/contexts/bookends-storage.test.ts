import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PreparationTopic } from '@/types/bookends'

import { loadPrepTopicsFromStorage, savePrepTopicsToStorage } from './bookends-reducer'

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
