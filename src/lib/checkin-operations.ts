import type { ActionItem, Note, DbActionItem } from '@/types'
import { createClient } from '@/lib/supabase/client'

export function mapDbActionItem(item: DbActionItem): ActionItem {
  return {
    id: item.id,
    coupleId: item.couple_id,
    checkInId: item.check_in_id,
    title: item.title,
    description: item.description,
    assignedTo: item.assigned_to,
    dueDate: item.due_date,
    completed: item.completed,
    completedAt: item.completed_at,
    createdAt: item.created_at,
  }
}

export async function fetchActiveCheckIn(coupleId: string) {
  const supabase = createClient()
  return supabase
    .from('check_ins')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('status', 'in-progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
}

export async function fetchCheckInActionItems(checkInId: string, coupleId: string) {
  const supabase = createClient()
  return supabase.from('action_items').select('*').eq('check_in_id', checkInId).eq('couple_id', coupleId)
}

export async function insertCheckIn(id: string, coupleId: string, startedAt: string, categories: string[]) {
  const supabase = createClient()
  return supabase
    .from('check_ins')
    .insert({ id, couple_id: coupleId, started_at: startedAt, status: 'in-progress', categories })
    .select()
    .single()
}

export async function updateCheckInStatus(id: string, status: 'completed' | 'abandoned') {
  const supabase = createClient()
  return supabase
    .from('check_ins')
    .update({ status, completed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
}

export async function insertNote(params: {
  coupleId: string
  authorId: string
  checkInId: string | null
  content: string
  privacy: string
  tags: string[]
  categoryId: string | null
}) {
  const supabase = createClient()
  return supabase
    .from('notes')
    .insert({
      couple_id: params.coupleId,
      author_id: params.authorId,
      check_in_id: params.checkInId,
      content: params.content,
      privacy: params.privacy,
      tags: params.tags,
      category_id: params.categoryId,
    })
    .select()
    .single()
}

export async function updateNote(noteId: string, updates: Partial<Note>) {
  const supabase = createClient()
  return supabase
    .from('notes')
    .update({ content: updates.content, privacy: updates.privacy, tags: updates.tags })
    .eq('id', noteId)
}

export async function deleteNote(noteId: string) {
  const supabase = createClient()
  return supabase.from('notes').delete().eq('id', noteId)
}

export async function insertActionItem(params: {
  coupleId: string
  checkInId: string | null
  title: string
  description: string | null
  assignedTo: string | null
  dueDate: string | null
}) {
  const supabase = createClient()
  return supabase.from('action_items').insert({
    couple_id: params.coupleId,
    check_in_id: params.checkInId,
    title: params.title,
    description: params.description,
    assigned_to: params.assignedTo,
    due_date: params.dueDate,
    completed: false,
  })
}

export async function updateActionItemDb(actionItemId: string, updates: Partial<ActionItem>) {
  const supabase = createClient()
  return supabase
    .from('action_items')
    .update({
      title: updates.title,
      description: updates.description,
      assigned_to: updates.assignedTo,
      due_date: updates.dueDate,
    })
    .eq('id', actionItemId)
}

export async function deleteActionItem(actionItemId: string) {
  const supabase = createClient()
  return supabase.from('action_items').delete().eq('id', actionItemId)
}

export async function toggleActionItemDb(actionItemId: string, currentCompleted: boolean) {
  const supabase = createClient()
  return supabase
    .from('action_items')
    .update({
      completed: !currentCompleted,
      completed_at: !currentCompleted ? new Date().toISOString() : null,
    })
    .eq('id', actionItemId)
}
