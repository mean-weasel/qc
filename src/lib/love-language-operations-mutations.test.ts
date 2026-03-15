import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DbLoveLanguage, DbLoveAction } from '@/types'

import { insertLanguage, deleteLanguageDb, insertAction, completeActionDb } from '@/lib/love-language-operations'
import { buildMockClient } from '@/lib/__test-helpers__/mock-client'

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/client'

const mockCreateClient = createClient as ReturnType<typeof vi.fn>

// --- Fixtures ---

function makeDbLanguage(overrides: Partial<DbLoveLanguage> = {}): DbLoveLanguage {
  return {
    id: 'lang-1',
    couple_id: 'couple-1',
    user_id: 'user-1',
    title: 'Words of Affirmation',
    description: 'Verbal compliments',
    category: 'words',
    privacy: 'shared',
    importance: 'high',
    examples: ['Thank you', 'I love you'],
    tags: ['daily', 'verbal'],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    ...overrides,
  }
}

const VALID_UUID = '00000000-0000-4000-8000-000000000001'

function makeDbAction(overrides: Partial<DbLoveAction> = {}): DbLoveAction {
  return {
    id: 'action-1',
    couple_id: 'couple-1',
    linked_language_id: VALID_UUID,
    title: 'Write a love note',
    description: 'Leave a sticky note on the mirror',
    status: 'planned',
    frequency: 'weekly',
    difficulty: 'easy',
    completed_count: 3,
    last_completed_at: '2025-01-10T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

// --- Tests ---

describe('insertLanguage', () => {
  let mock: ReturnType<typeof buildMockClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mock = buildMockClient()
    mockCreateClient.mockReturnValue(mock.client)
  })

  it('calls from/insert/select/single and returns mapped result', async () => {
    const dbRow = makeDbLanguage()
    mock.result.data = dbRow
    mock.result.error = null

    const lang = {
      title: 'Words of Affirmation',
      description: 'Verbal compliments' as string | null,
      category: 'words' as const,
      privacy: 'shared' as const,
      importance: 'high' as const,
      examples: ['Thank you', 'I love you'],
      tags: ['daily', 'verbal'],
    }
    const result = await insertLanguage('couple-1', 'user-1', lang)

    expect(mock.client.from).toHaveBeenCalledWith('love_languages')
    expect(mock.client.insert).toHaveBeenCalledWith({
      couple_id: 'couple-1',
      user_id: 'user-1',
      title: 'Words of Affirmation',
      description: 'Verbal compliments',
      category: 'words',
      privacy: 'shared',
      importance: 'high',
      examples: ['Thank you', 'I love you'],
      tags: ['daily', 'verbal'],
    })
    expect(mock.client.select).toHaveBeenCalled()
    expect(mock.client.single).toHaveBeenCalled()

    expect(result.id).toBe('lang-1')
    expect(result.coupleId).toBe('couple-1')
  })

  it('throws on Supabase error', async () => {
    mock.result.data = null
    mock.result.error = { message: 'insert failed' }

    const lang = {
      title: 'Test',
      description: null,
      category: 'words' as const,
      privacy: 'shared' as const,
      importance: 'low' as const,
      examples: [] as string[],
      tags: [] as string[],
    }

    await expect(insertLanguage('couple-1', 'user-1', lang)).rejects.toEqual({ message: 'insert failed' })
  })
})

describe('deleteLanguageDb', () => {
  let mock: ReturnType<typeof buildMockClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mock = buildMockClient()
    mockCreateClient.mockReturnValue(mock.client)
  })

  it('calls from/delete/eq', async () => {
    mock.result.error = null

    await deleteLanguageDb('lang-1')

    expect(mock.client.from).toHaveBeenCalledWith('love_languages')
    expect(mock.client.delete).toHaveBeenCalled()
    expect(mock.client.eq).toHaveBeenCalledWith('id', 'lang-1')
  })

  it('throws on Supabase error', async () => {
    mock.result.error = { message: 'delete failed' }

    await expect(deleteLanguageDb('lang-1')).rejects.toEqual({ message: 'delete failed' })
  })
})

describe('insertAction', () => {
  let mock: ReturnType<typeof buildMockClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mock = buildMockClient()
    mockCreateClient.mockReturnValue(mock.client)
  })

  it('calls from/insert/select/single and returns mapped result', async () => {
    const dbRow = makeDbAction()
    mock.result.data = dbRow
    mock.result.error = null

    const action = {
      linkedLanguageId: VALID_UUID as string | null,
      title: 'Write a love note',
      description: 'Leave a sticky note on the mirror' as string | null,
      status: 'planned' as const,
      frequency: 'weekly' as const,
      difficulty: 'easy' as const,
    }
    const result = await insertAction('couple-1', action)

    expect(mock.client.from).toHaveBeenCalledWith('love_actions')
    expect(mock.client.insert).toHaveBeenCalledWith({
      couple_id: 'couple-1',
      linked_language_id: VALID_UUID,
      title: 'Write a love note',
      description: 'Leave a sticky note on the mirror',
      status: 'planned',
      frequency: 'weekly',
      difficulty: 'easy',
    })
    expect(mock.client.select).toHaveBeenCalled()
    expect(mock.client.single).toHaveBeenCalled()

    expect(result.id).toBe('action-1')
    expect(result.coupleId).toBe('couple-1')
  })

  it('throws on Supabase error', async () => {
    mock.result.data = null
    mock.result.error = { message: 'insert action failed' }

    const action = {
      linkedLanguageId: VALID_UUID as string | null,
      title: 'Test',
      description: null,
      status: 'suggested' as const,
      frequency: 'once' as const,
      difficulty: 'easy' as const,
    }

    await expect(insertAction('couple-1', action)).rejects.toEqual({ message: 'insert action failed' })
  })
})

describe('completeActionDb', () => {
  let mock: ReturnType<typeof buildMockClient>

  beforeEach(() => {
    vi.clearAllMocks()
    mock = buildMockClient()
    mockCreateClient.mockReturnValue(mock.client)
  })

  it('calls from/update/eq with status completed and incremented count', async () => {
    mock.result.error = null

    await completeActionDb('action-1', 3)

    expect(mock.client.from).toHaveBeenCalledWith('love_actions')
    expect(mock.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        completed_count: 4,
      }),
    )
    expect(mock.client.eq).toHaveBeenCalledWith('id', 'action-1')

    const updateArg = mock.client.update.mock.calls[0][0]
    expect(updateArg.last_completed_at).toBeDefined()
    expect(typeof updateArg.last_completed_at).toBe('string')
  })

  it('throws on Supabase error', async () => {
    mock.result.error = { message: 'complete failed' }

    await expect(completeActionDb('action-1', 0)).rejects.toEqual({ message: 'complete failed' })
  })
})
