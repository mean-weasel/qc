'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAuth } from '@/lib/auth'
import { sendEmail, shouldSendEmail } from '@/lib/email/send'
import { sanitizeDbError } from '@/lib/utils'
import { RequestNotificationEmail } from '@/lib/email/templates/request-notification'
import { createRateLimiter } from '@/lib/rate-limit'
import { validate } from '@/lib/validation'

const requestLimiter = createRateLimiter({ maxRequests: 20, windowSeconds: 86400 })

const requestSchema = z.object({
  requested_for: z.string().uuid('Invalid partner ID'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(['activity', 'task', 'reminder', 'conversation', 'date-night', 'custom']),
  priority: z.enum(['low', 'medium', 'high']),
  suggested_date: z.string().optional(),
})

export interface RequestActionState {
  error?: string
  success?: boolean
}

export async function createRequest(_prev: RequestActionState, formData: FormData): Promise<RequestActionState> {
  const { user, supabase } = await requireAuth()

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()

  if (!profile?.couple_id) {
    return { error: 'You must be in a couple to create requests' }
  }

  const allowed = await requestLimiter.check(`request:create:${profile.couple_id}`)
  if (!allowed) {
    return { error: 'Too many requests. Please try again later.' }
  }

  const raw = {
    requested_for: formData.get('requested_for'),
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    category: formData.get('category'),
    priority: formData.get('priority'),
    suggested_date: formData.get('suggested_date') || undefined,
  }

  const { data, error: validationError } = validate(requestSchema, raw)
  if (validationError || !data) return { error: validationError ?? 'Validation failed' }

  const { count: requestCount } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('couple_id', profile.couple_id)

  if (requestCount !== null && requestCount >= 100) {
    return { error: 'You\u2019ve reached the maximum of 100 requests. Delete some to create new ones.' }
  }

  const { error } = await supabase.from('requests').insert({
    couple_id: profile.couple_id,
    requested_by: user.id,
    requested_for: data.requested_for,
    title: data.title,
    description: data.description ?? null,
    category: data.category,
    priority: data.priority,
    status: 'pending',
    suggested_date: data.suggested_date ?? null,
  })

  if (error) return { error: sanitizeDbError(error, 'createRequest') }

  // Send email notification to partner
  try {
    const { data: partnerProfile } = await supabase
      .from('profiles')
      .select('email, display_name')
      .eq('id', data.requested_for)
      .single()

    const { data: requesterProfile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()

    if (partnerProfile?.email) {
      const canSend = await shouldSendEmail(partnerProfile.email)
      if (canSend) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
        await sendEmail({
          to: partnerProfile.email,
          subject: `New request from ${requesterProfile?.display_name ?? 'your partner'}`,
          react: RequestNotificationEmail({
            partnerName: requesterProfile?.display_name ?? 'Your partner',
            title: data.title,
            category: data.category,
            priority: data.priority,
            requestsUrl: `${baseUrl}/requests`,
          }),
        })
      }
    }
  } catch {
    // Email send failed -- non-blocking, request was created successfully
  }

  revalidatePath('/requests')
  return { success: true }
}

export async function respondToRequest(
  requestId: string,
  status: 'accepted' | 'declined',
): Promise<{ error?: string }> {
  const { user, supabase } = await requireAuth()

  // Verify request belongs to user's couple
  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()

  if (!profile?.couple_id) {
    return { error: 'You must be in a couple to respond to requests' }
  }

  // Verify the request belongs to the user's couple
  const { data: request } = await supabase.from('requests').select('couple_id').eq('id', requestId).single()

  if (!request || request.couple_id !== profile.couple_id) {
    return { error: 'Request does not belong to your couple' }
  }

  const { error } = await supabase.from('requests').update({ status }).eq('id', requestId)

  if (error) return { error: sanitizeDbError(error, 'respondToRequest') }

  revalidatePath('/requests')
  return {}
}

export async function deleteRequest(requestId: string): Promise<{ error?: string }> {
  const { user, supabase } = await requireAuth()

  // Verify request belongs to user's couple
  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()

  if (!profile?.couple_id) {
    return { error: 'You must be in a couple to delete requests' }
  }

  // Verify the request belongs to the user's couple
  const { data: request } = await supabase.from('requests').select('couple_id').eq('id', requestId).single()

  if (!request || request.couple_id !== profile.couple_id) {
    return { error: 'Request does not belong to your couple' }
  }

  const { error } = await supabase.from('requests').delete().eq('id', requestId)

  if (error) return { error: sanitizeDbError(error, 'deleteRequest') }

  revalidatePath('/requests')
  return {}
}

// WT-4 Cross-Feature Linking: Convert request to reminder
export async function convertRequestToReminder(requestId: string): Promise<{ error?: string; reminderId?: string }> {
  const { user, supabase } = await requireAuth()

  // Verify request belongs to user's couple
  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()

  if (!profile?.couple_id) {
    return { error: 'You must be in a couple to convert requests' }
  }

  // Call the atomic RPC function
  const { data, error } = await supabase.rpc('convert_request_to_reminder', {
    p_request_id: requestId,
    p_couple_id: profile.couple_id,
    p_user_id: user.id,
  })

  if (error) return { error: sanitizeDbError(error, 'convertRequestToReminder') }

  // Check if RPC returned an error
  if (data && typeof data === 'object' && 'error' in data) {
    return { error: data.error as string }
  }

  // Extract reminder_id from RPC result
  const reminderId =
    data && typeof data === 'object' && 'reminder_id' in data ? (data.reminder_id as string) : undefined

  if (!reminderId) {
    return { error: 'Failed to create reminder' }
  }

  revalidatePath('/requests')
  revalidatePath('/reminders')
  return { reminderId }
}
