'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAuth } from '@/lib/auth'
import { sanitizeDbError } from '@/lib/utils'
import { validate } from '@/lib/validation'
import type { DbReminder } from '@/types/database'

const reminderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().max(1000).optional(),
  category: z.enum(['habit', 'check-in', 'action-item', 'special-date', 'custom']),
  frequency: z.enum(['once', 'daily', 'weekly', 'monthly', 'custom']),
  scheduled_for: z.string().min(1, 'Schedule date is required'),
  notification_channel: z.enum(['in-app', 'email', 'both', 'none']),
  assigned_to: z.string().uuid().optional(),
})

export interface ReminderActionState {
  error?: string
  success?: boolean
  reminder?: DbReminder
}

export async function createReminder(_prev: ReminderActionState, formData: FormData): Promise<ReminderActionState> {
  const { user, supabase } = await requireAuth()

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()

  if (!profile?.couple_id) {
    return { error: 'You must be in a couple to create reminders' }
  }

  const { count } = await supabase
    .from('reminders')
    .select('*', { count: 'exact', head: true })
    .eq('couple_id', profile.couple_id)

  if (count !== null && count >= 50) {
    return { error: 'You\u2019ve reached the maximum of 50 reminders. Delete some to create new ones.' }
  }

  const assignedTo = formData.get('assigned_to')
  const raw = {
    title: formData.get('title'),
    message: formData.get('message') || undefined,
    category: formData.get('category'),
    frequency: formData.get('frequency'),
    scheduled_for: formData.get('scheduled_for'),
    notification_channel: formData.get('notification_channel'),
    assigned_to: assignedTo && typeof assignedTo === 'string' && assignedTo.length > 0 ? assignedTo : undefined,
  }

  const { data, error: validationError } = validate(reminderSchema, raw)
  if (validationError || !data) return { error: validationError ?? 'Validation failed' }

  const { data: reminder, error } = await supabase
    .from('reminders')
    .insert({
      couple_id: profile.couple_id,
      created_by: user.id,
      title: data.title,
      message: data.message ?? null,
      category: data.category,
      frequency: data.frequency,
      scheduled_for: data.scheduled_for,
      notification_channel: data.notification_channel,
      assigned_to: data.assigned_to ?? null,
      is_active: true,
      custom_schedule: null,
    })
    .select()
    .single()

  if (error) return { error: sanitizeDbError(error, 'createReminder') }

  revalidatePath('/reminders')
  return { success: true, reminder: reminder as DbReminder }
}

export async function toggleReminder(reminderId: string, isActive: boolean): Promise<{ error?: string }> {
  const { user, supabase } = await requireAuth()

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'You must be in a couple' }

  const { error } = await supabase
    .from('reminders')
    .update({ is_active: isActive })
    .eq('id', reminderId)
    .eq('couple_id', profile.couple_id)

  if (error) return { error: sanitizeDbError(error, 'toggleReminder') }

  revalidatePath('/reminders')
  return {}
}

export async function deleteReminder(reminderId: string): Promise<{ error?: string }> {
  const { user, supabase } = await requireAuth()

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'You must be in a couple' }

  const { error } = await supabase.from('reminders').delete().eq('id', reminderId).eq('couple_id', profile.couple_id)

  if (error) return { error: sanitizeDbError(error, 'deleteReminder') }

  revalidatePath('/reminders')
  return {}
}

export async function snoozeReminder(
  reminderId: string,
  duration: '15min' | '1hour' | 'tomorrow',
): Promise<{ error?: string }> {
  const { user, supabase } = await requireAuth()

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'You must be in a couple' }

  const now = new Date()
  let snoozeUntil: Date

  switch (duration) {
    case '15min':
      snoozeUntil = new Date(now.getTime() + 15 * 60 * 1000)
      break
    case '1hour':
      snoozeUntil = new Date(now.getTime() + 60 * 60 * 1000)
      break
    case 'tomorrow': {
      snoozeUntil = new Date(now)
      snoozeUntil.setDate(snoozeUntil.getDate() + 1)
      snoozeUntil.setHours(9, 0, 0, 0)
      break
    }
  }

  const { error } = await supabase
    .from('reminders')
    .update({ is_snoozed: true, snooze_until: snoozeUntil.toISOString() })
    .eq('id', reminderId)
    .eq('couple_id', profile.couple_id)

  if (error) return { error: sanitizeDbError(error, 'snoozeReminder') }

  revalidatePath('/reminders')
  return {}
}

export async function unsnoozeReminder(reminderId: string): Promise<{ error?: string }> {
  const { user, supabase } = await requireAuth()

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'You must be in a couple' }

  const { error } = await supabase
    .from('reminders')
    .update({ is_snoozed: false, snooze_until: null })
    .eq('id', reminderId)
    .eq('couple_id', profile.couple_id)

  if (error) return { error: sanitizeDbError(error, 'unsnoozeReminder') }

  revalidatePath('/reminders')
  return {}
}
