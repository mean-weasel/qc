'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { requireAuth } from '@/lib/auth'
import { leaveCouple, resendInvite } from '@/lib/couples'
import { sanitizeDbError } from '@/lib/utils'
import { exportUserData as exportData, type UserData } from '@/lib/data-export'
import { sendEmail, shouldSendEmail } from '@/lib/email/send'
import { InviteEmail } from '@/lib/email/templates/invite'
import { createRateLimiter } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { validate } from '@/lib/validation'

const resendLimiter = createRateLimiter({ maxRequests: 3, windowSeconds: 3600 })

const profileSchema = z.object({
  display_name: z.string().min(1, 'Name is required').max(100),
  avatar_url: z.string().url().nullable().optional(),
})

export interface SettingsActionState {
  error?: string
  success?: boolean
}

export async function updateProfile(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const { user, supabase } = await requireAuth()

  const raw = {
    display_name: formData.get('display_name'),
    avatar_url: formData.get('avatar_url') || null,
  }

  const { data, error: validationError } = validate(profileSchema, raw)
  if (validationError) return { error: validationError }

  const { error } = await supabase.from('profiles').update(data).eq('id', user.id)

  if (error) return { error: sanitizeDbError(error, 'updateProfile') }

  revalidatePath('/settings')
  return { success: true }
}

export async function leaveCoupleAction(): Promise<{ error?: string }> {
  await requireAuth()
  const result = await leaveCouple()
  if (result.error) return { error: result.error }

  revalidatePath('/settings')
  redirect('/onboarding')
}

export async function resendInviteAction(inviteId: string): Promise<{ error?: string }> {
  const { user, supabase } = await requireAuth()

  // Verify invite belongs to the user's couple
  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'You must be in a couple' }

  const { data: invite } = await supabase.from('couple_invites').select('couple_id').eq('id', inviteId).single()
  if (!invite || invite.couple_id !== profile.couple_id) {
    return { error: 'Invite not found' }
  }

  const allowed = await resendLimiter.check(`invite:resend:${profile.couple_id}`)
  if (!allowed) {
    return { error: 'Too many requests. Please try again later.' }
  }

  const result = await resendInvite(inviteId)
  if (result.error) return { error: result.error }

  if (result.data) {
    const canSend = await shouldSendEmail(result.data.invited_email)
    if (!canSend) return { error: 'Unable to send to this email address' }

    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
    const inviterName = profile?.display_name ?? 'Your partner'
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invite/${result.data.token}`

    // Check if invitee already has a profile (e.g. partial signup) and build unsubscribe link
    // Uses admin client to bypass RLS — invitee may not be in the same couple yet
    const adminClient = createAdminClient()
    const { data: inviteeProfile } = await adminClient
      .from('profiles')
      .select('email_unsubscribe_token')
      .eq('email', result.data.invited_email)
      .maybeSingle()
    const unsubscribeUrl = inviteeProfile?.email_unsubscribe_token
      ? `${baseUrl}/api/email/unsubscribe/${inviteeProfile.email_unsubscribe_token}`
      : undefined

    try {
      await sendEmail({
        to: result.data.invited_email,
        subject: `${inviterName} invited you to QC`,
        react: InviteEmail({ inviterName, inviteUrl, unsubscribeUrl }),
      })
    } catch {
      // Email send failed -- don't block the UI, they can try again
    }
  }

  revalidatePath('/settings')
  return {}
}

const ALLOWED_SETTING_KEYS = ['privateByDefault', 'shareProgress', 'emailNotifications', 'quietHoursEnabled'] as const

export async function updateCoupleSettings(key: string, value: boolean): Promise<{ error?: string }> {
  if (!ALLOWED_SETTING_KEYS.includes(key as (typeof ALLOWED_SETTING_KEYS)[number])) {
    return { error: 'Invalid setting key' }
  }

  const { user, supabase } = await requireAuth()

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()

  if (!profile?.couple_id) return { error: 'No couple found' }

  const { error } = await supabase.rpc('update_couple_setting', {
    p_couple_id: profile.couple_id,
    p_key: key,
    p_value: value,
  })

  if (error) return { error: sanitizeDbError(error, 'updateCoupleSettings') }

  revalidatePath('/settings')
  return {}
}

export async function exportUserData(): Promise<{ data: UserData | null; error: string | null }> {
  const { user, supabase } = await requireAuth()
  return await exportData(supabase, user.id)
}
