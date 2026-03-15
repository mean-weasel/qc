import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createMockSupabaseClient } from '@/test/mocks/supabase'

const mockUser = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }
const mockCoupleId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

let mockSupabase: ReturnType<typeof createMockSupabaseClient>

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

beforeEach(async () => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabaseClient()

  const { requireAuth } = await import('@/lib/auth')
  ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: mockUser,
    supabase: mockSupabase,
  })
})

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.append(k, v)
  return fd
}

describe('createNote', () => {
  it('creates a note with valid data', async () => {
    const { createNote } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
    mockSupabase._queryBuilder.insert = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.insert.mockReturnValue({ data: null, error: null })

    const fd = makeFormData({ content: 'Hello', privacy: 'shared', tags: '[]' })
    const result = await createNote({ error: null }, fd)

    expect(result).toEqual({ error: null })
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    expect(mockSupabase.from).toHaveBeenCalledWith('notes')
  })

  it('returns error when content is missing', async () => {
    const { createNote } = await import('./actions')

    const fd = makeFormData({ content: '', privacy: 'shared', tags: '[]' })
    const result = await createNote({ error: null }, fd)

    expect(result.error).toBeTruthy()
    expect(result.error).toContain('Content is required')
  })

  it('returns error when user has no couple', async () => {
    const { createNote } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: null },
      error: null,
    })

    const fd = makeFormData({ content: 'Hi', privacy: 'shared', tags: '[]' })
    const result = await createNote({ error: null }, fd)

    expect(result.error).toBe('You must be in a couple to create notes.')
  })

  it('returns error on database insert failure', async () => {
    const { createNote } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })
    mockSupabase._queryBuilder.insert = vi.fn().mockReturnValue({
      data: null,
      error: { message: 'DB insert failed' },
    })

    const fd = makeFormData({ content: 'Hi', privacy: 'shared', tags: '[]' })
    const result = await createNote({ error: null }, fd)

    expect(result.error).toBe('Something went wrong. Please try again.')
  })

  it('returns error when couple has reached 1000 note cap', async () => {
    const { createNote } = await import('./actions')

    mockSupabase._queryBuilder.single.mockResolvedValueOnce({
      data: { couple_id: mockCoupleId },
      error: null,
    })

    // Mock the count query: select().eq() resolves with count: 1000
    mockSupabase._queryBuilder.select = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi
      .fn()
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockResolvedValueOnce({ count: 1000, data: null, error: null })

    const fd = makeFormData({ content: 'Hi', privacy: 'shared', tags: '[]' })
    const result = await createNote({ error: null }, fd)

    expect(result.error).toContain('maximum of 1,000 notes')
  })
})

describe('updateNote', () => {
  it('updates a note with valid data', async () => {
    const { updateNote } = await import('./actions')

    mockSupabase._queryBuilder.eq = vi.fn().mockReturnThis()
    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.select = vi.fn().mockReturnValue({
      data: [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }],
      error: null,
    })

    const fd = makeFormData({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', content: 'Updated' })
    const result = await updateNote({ error: null }, fd)

    expect(result).toEqual({ error: null })
    expect(mockSupabase.from).toHaveBeenCalledWith('notes')
  })

  it('returns error when id is missing', async () => {
    const { updateNote } = await import('./actions')

    const fd = makeFormData({ content: 'Updated' })
    const result = await updateNote({ error: null }, fd)

    expect(result.error).toBe('Note ID is required')
  })

  it('returns error on database update failure', async () => {
    const { updateNote } = await import('./actions')

    mockSupabase._queryBuilder.update = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnThis()
    mockSupabase._queryBuilder.select = vi.fn().mockReturnValue({
      data: null,
      error: { message: 'Update failed' },
    })

    const fd = makeFormData({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', content: 'Updated' })
    const result = await updateNote({ error: null }, fd)

    expect(result.error).toBe('Something went wrong. Please try again.')
  })
})

describe('deleteNoteById', () => {
  it('deletes a note with valid id', async () => {
    const { deleteNoteById } = await import('./actions')

    mockSupabase._queryBuilder.delete = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi
      .fn()
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockReturnValue({ data: null, error: null })

    const result = await deleteNoteById('cccccccc-cccc-4ccc-8ccc-cccccccccccc')

    expect(result).toEqual({ error: null })
    expect(mockSupabase.from).toHaveBeenCalledWith('notes')
  })

  it('returns error for invalid uuid', async () => {
    const { deleteNoteById } = await import('./actions')

    const result = await deleteNoteById('not-a-uuid')

    expect(result.error).toBeTruthy()
  })

  it('returns error on database delete failure', async () => {
    const { deleteNoteById } = await import('./actions')

    mockSupabase._queryBuilder.delete = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi
      .fn()
      .mockReturnValueOnce(mockSupabase._queryBuilder)
      .mockReturnValue({ data: null, error: { message: 'Delete failed' } })

    const result = await deleteNoteById('cccccccc-cccc-4ccc-8ccc-cccccccccccc')

    expect(result.error).toBe('Something went wrong. Please try again.')
  })
})

describe('bulkDeleteNotes', () => {
  it('deletes multiple notes with valid ids', async () => {
    const { bulkDeleteNotes } = await import('./actions')

    mockSupabase._queryBuilder.delete = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.in = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({ data: null, error: null })

    const ids = ['cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd']
    const result = await bulkDeleteNotes(ids)

    expect(result).toEqual({ error: null })
    expect(mockSupabase.from).toHaveBeenCalledWith('notes')
  })

  it('returns error when ids array is empty', async () => {
    const { bulkDeleteNotes } = await import('./actions')

    const result = await bulkDeleteNotes([])

    expect(result.error).toBeTruthy()
    expect(result.error).toContain('At least one note ID is required')
  })

  it('returns error when ids contain invalid UUIDs', async () => {
    const { bulkDeleteNotes } = await import('./actions')

    const result = await bulkDeleteNotes(['not-a-uuid', 'also-not-valid'])

    expect(result.error).toBeTruthy()
  })

  it('returns error on database delete failure', async () => {
    const { bulkDeleteNotes } = await import('./actions')

    mockSupabase._queryBuilder.delete = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.in = vi.fn().mockReturnValue(mockSupabase._queryBuilder)
    mockSupabase._queryBuilder.eq = vi.fn().mockReturnValue({
      data: null,
      error: { message: 'Bulk delete failed' },
    })

    const result = await bulkDeleteNotes(['cccccccc-cccc-4ccc-8ccc-cccccccccccc'])

    expect(result.error).toBe('Something went wrong. Please try again.')
  })

  it('returns error when exceeding 50 ids', async () => {
    const { bulkDeleteNotes } = await import('./actions')

    const ids = Array.from({ length: 51 }, (_, i) => {
      const hex = i.toString(16).padStart(2, '0')
      return `cccccccc-cccc-4ccc-8ccc-cccccccc${hex}cc`
    })

    const result = await bulkDeleteNotes(ids)

    expect(result.error).toBeTruthy()
    expect(result.error).toContain('Cannot delete more than 50 notes at once')
  })
})
