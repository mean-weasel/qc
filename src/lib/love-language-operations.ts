import type { SupabaseClient } from '@supabase/supabase-js'
import type { LoveLanguage, LoveAction, DbLoveLanguage, DbLoveAction } from '@/types'

import { createClient } from '@/lib/supabase/client'
import { loveActionSchema, validate } from '@/lib/validation'

function getClient(): SupabaseClient {
  return createClient()
}

export function mapDbLanguage(row: DbLoveLanguage): LoveLanguage {
  return {
    id: row.id,
    coupleId: row.couple_id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    privacy: row.privacy,
    importance: row.importance,
    examples: row.examples ?? [],
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapDbAction(row: DbLoveAction): LoveAction {
  return {
    id: row.id,
    coupleId: row.couple_id,
    linkedLanguageId: row.linked_language_id,
    title: row.title,
    description: row.description,
    status: row.status,
    frequency: row.frequency,
    difficulty: row.difficulty,
    completedCount: row.completed_count,
    lastCompletedAt: row.last_completed_at,
    createdAt: row.created_at,
  }
}

export async function fetchLanguages(coupleId: string, userId: string): Promise<LoveLanguage[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('love_languages')
    .select('*')
    .eq('couple_id', coupleId)
    .or(`user_id.eq.${userId},privacy.eq.shared`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapDbLanguage)
}

export async function fetchActions(coupleId: string): Promise<LoveAction[]> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('love_actions')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapDbAction)
}

export async function insertLanguage(
  coupleId: string,
  userId: string,
  lang: Omit<LoveLanguage, 'id' | 'coupleId' | 'userId' | 'createdAt' | 'updatedAt'>,
): Promise<LoveLanguage> {
  const supabase = getClient()
  const { data, error } = await supabase
    .from('love_languages')
    .insert({
      couple_id: coupleId,
      user_id: userId,
      title: lang.title,
      description: lang.description,
      category: lang.category,
      privacy: lang.privacy,
      importance: lang.importance,
      examples: lang.examples,
      tags: lang.tags,
    })
    .select()
    .single()

  if (error) throw error
  return mapDbLanguage(data)
}

export async function updateLanguageDb(
  id: string,
  updates: Partial<Omit<LoveLanguage, 'id' | 'coupleId' | 'userId' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  const supabase = getClient()
  const dbUpdates: Record<string, unknown> = {}
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.category !== undefined) dbUpdates.category = updates.category
  if (updates.privacy !== undefined) dbUpdates.privacy = updates.privacy
  if (updates.importance !== undefined) dbUpdates.importance = updates.importance
  if (updates.examples !== undefined) dbUpdates.examples = updates.examples
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags

  const { error } = await supabase.from('love_languages').update(dbUpdates).eq('id', id)
  if (error) throw error
}

export async function deleteLanguageDb(id: string): Promise<void> {
  const supabase = getClient()
  const { error } = await supabase.from('love_languages').delete().eq('id', id)
  if (error) throw error
}

export async function insertAction(
  coupleId: string,
  action: Omit<LoveAction, 'id' | 'coupleId' | 'completedCount' | 'lastCompletedAt' | 'createdAt'>,
): Promise<LoveAction> {
  const { error: validationError } = validate(loveActionSchema, {
    title: action.title,
    description: action.description,
    language_id: action.linkedLanguageId,
    status: action.status,
    frequency: action.frequency,
    difficulty: action.difficulty,
  })
  if (validationError) throw new Error(validationError)

  const supabase = getClient()
  const { data, error } = await supabase
    .from('love_actions')
    .insert({
      couple_id: coupleId,
      linked_language_id: action.linkedLanguageId,
      title: action.title,
      description: action.description,
      status: action.status,
      frequency: action.frequency,
      difficulty: action.difficulty,
    })
    .select()
    .single()

  if (error) throw error
  return mapDbAction(data)
}

export async function updateActionDb(
  id: string,
  updates: Partial<Omit<LoveAction, 'id' | 'coupleId' | 'createdAt'>>,
): Promise<void> {
  const supabase = getClient()
  const dbUpdates: Record<string, unknown> = {}
  if (updates.linkedLanguageId !== undefined) dbUpdates.linked_language_id = updates.linkedLanguageId
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency
  if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty
  if (updates.completedCount !== undefined) dbUpdates.completed_count = updates.completedCount
  if (updates.lastCompletedAt !== undefined) dbUpdates.last_completed_at = updates.lastCompletedAt

  const { error } = await supabase.from('love_actions').update(dbUpdates).eq('id', id)
  if (error) throw error
}

export async function deleteActionDb(id: string): Promise<void> {
  const supabase = getClient()
  const { error } = await supabase.from('love_actions').delete().eq('id', id)
  if (error) throw error
}

export async function completeActionDb(id: string, currentCount: number): Promise<void> {
  const supabase = getClient()
  const { error } = await supabase
    .from('love_actions')
    .update({
      status: 'completed',
      completed_count: currentCount + 1,
      last_completed_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}
