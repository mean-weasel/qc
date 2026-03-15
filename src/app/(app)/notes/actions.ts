'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAuth } from '@/lib/auth'
import { sanitizeDbError } from '@/lib/utils'
import { validate } from '@/lib/validation'

function safeParseJsonArray(value: string | null): unknown[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const noteSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Content must be 5000 characters or less'),
  privacy: z.enum(['private', 'shared', 'draft']),
  tags: z.array(z.string()).max(10).default([]),
  category_id: z.string().nullable().default(null),
  check_in_id: z.string().nullable().default(null),
})

const updateNoteSchema = noteSchema.partial()

const deleteSchema = z.object({
  id: z.string().uuid(),
})

export type NoteActionState = {
  error: string | null
}

export async function createNote(_prev: NoteActionState, formData: FormData): Promise<NoteActionState> {
  const { user, supabase } = await requireAuth()

  const raw = {
    content: formData.get('content'),
    privacy: formData.get('privacy') ?? 'draft',
    tags: safeParseJsonArray(formData.get('tags') as string),
    category_id: formData.get('category_id') || null,
    check_in_id: formData.get('check_in_id') || null,
  }

  const { data: input, error: validationError } = validate(noteSchema, raw)

  if (validationError || !input) {
    return { error: validationError ?? 'Validation failed' }
  }

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()

  if (!profile?.couple_id) {
    return { error: 'You must be in a couple to create notes.' }
  }

  const { error: insertError } = await supabase.from('notes').insert({
    couple_id: profile.couple_id,
    author_id: user.id,
    content: input.content,
    privacy: input.privacy,
    tags: input.tags,
    category_id: input.category_id,
    check_in_id: input.check_in_id,
  })

  if (insertError) {
    return { error: sanitizeDbError(insertError, 'createNote') }
  }

  revalidatePath('/notes')
  return { error: null }
}

export async function updateNote(_prev: NoteActionState, formData: FormData): Promise<NoteActionState> {
  const { user, supabase } = await requireAuth()

  const id = formData.get('id') as string
  if (!id) return { error: 'Note ID is required' }

  const raw: Record<string, unknown> = {}
  const content = formData.get('content')
  const privacy = formData.get('privacy')
  const tags = formData.get('tags')

  if (content !== null) raw.content = content
  if (privacy !== null) raw.privacy = privacy
  if (tags !== null) raw.tags = safeParseJsonArray(tags as string)

  const { data: input, error: validationError } = validate(updateNoteSchema, raw)

  if (validationError || !input) {
    return { error: validationError ?? 'Validation failed' }
  }

  // Optimistic locking: if the client sends the last-known updated_at,
  // only update if the record hasn't been modified since
  const lastKnownUpdatedAt = formData.get('updated_at') as string | null

  let query = supabase.from('notes').update(input).eq('id', id).eq('author_id', user.id)

  if (lastKnownUpdatedAt) {
    query = query.eq('updated_at', lastKnownUpdatedAt)
  }

  const { data, error: updateError } = await query.select()

  if (updateError) {
    return { error: sanitizeDbError(updateError, 'updateNote') }
  }

  // No rows updated — either RLS blocked it or a concurrent edit occurred
  if (!data || data.length === 0) {
    if (lastKnownUpdatedAt) {
      return { error: 'This note was modified by your partner. Please reload and try again.' }
    }
    return { error: 'You can only edit notes you created' }
  }

  revalidatePath('/notes')
  return { error: null }
}

const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().uuid())
    .min(1, 'At least one note ID is required')
    .max(50, 'Cannot delete more than 50 notes at once'),
})

export async function bulkDeleteNotes(noteIds: string[]): Promise<{ error: string | null }> {
  const { user, supabase } = await requireAuth()

  const { data: input, error: validationError } = validate(bulkDeleteSchema, { ids: noteIds })

  if (validationError || !input) {
    return { error: validationError ?? 'Validation failed' }
  }

  const { error: deleteError } = await supabase.from('notes').delete().in('id', input.ids).eq('author_id', user.id)

  if (deleteError) {
    return { error: sanitizeDbError(deleteError, 'bulkDeleteNotes') }
  }

  revalidatePath('/notes')
  return { error: null }
}

export async function deleteNoteById(noteId: string): Promise<{ error: string | null }> {
  const { user, supabase } = await requireAuth()

  const { data: input, error: validationError } = validate(deleteSchema, { id: noteId })

  if (validationError || !input) {
    return { error: validationError ?? 'Validation failed' }
  }

  const { error: deleteError } = await supabase.from('notes').delete().eq('id', input.id).eq('author_id', user.id)

  if (deleteError) {
    return { error: sanitizeDbError(deleteError, 'deleteNote') }
  }

  revalidatePath('/notes')
  return { error: null }
}
