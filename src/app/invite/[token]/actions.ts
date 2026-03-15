'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { headers } from 'next/headers'

import { requireAuth } from '@/lib/auth'
import { acceptInvite, getInviteStatusByToken, type InviteValidationStatus } from '@/lib/couples'
import { createRateLimiter } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { validate } from '@/lib/validation'

const inviteLimiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 })

const tokenSchema = z.object({
  token: z.string().uuid('Invalid invite token'),
})

export type InviteState = {
  error: string | null
}

export async function validateInvite(token: string): Promise<{
  valid: boolean
  inviterEmail: string | null
  error: string | null
  reason: InviteValidationStatus
}> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') ?? 'unknown'
  if (!inviteLimiter.check(ip)) {
    return {
      valid: false,
      inviterEmail: null,
      error: 'Too many requests. Please try again later.',
      reason: 'not_found',
    }
  }

  const { error: validationError } = validate(tokenSchema, { token })

  if (validationError) {
    return { valid: false, inviterEmail: null, error: validationError, reason: 'not_found' }
  }

  const { status, invite } = await getInviteStatusByToken(token)

  if (status !== 'valid' || !invite) {
    return { valid: false, inviterEmail: invite?.invited_email ?? null, error: null, reason: status }
  }

  return { valid: true, inviterEmail: invite.invited_email, error: null, reason: 'valid' }
}

export async function acceptInviteAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const { user } = await requireAuth()

  const token = formData.get('token')

  const { data: input, error: validationError } = validate(tokenSchema, { token })

  if (validationError || !input) {
    return { error: validationError ?? 'Validation failed' }
  }

  // Check that the user is not already in a couple
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()

  if (profile?.couple_id) {
    return { error: 'You are already in a couple. Leave your current couple first.' }
  }

  const { error: acceptError } = await acceptInvite(input.token)

  if (acceptError) {
    return { error: acceptError }
  }

  redirect('/dashboard')
}
