import { type SupabaseClient } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DbCouple, DbProfile, DbCoupleInvite } from '@/types'

// --- User-scoped operations (respects RLS) ---

export async function createCouple(
  name?: string,
  existingClient?: SupabaseClient,
): Promise<{ data: DbCouple | null; error: string | null }> {
  const supabase = existingClient ?? (await createClient())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  // Use SECURITY DEFINER function to bypass RLS (auth.uid() may be NULL in server context)
  const { data: coupleId, error: rpcError } = await supabase.rpc('create_couple_for_user', {
    p_user_id: user.id,
    p_couple_name: name ?? null,
  })

  if (rpcError) return { data: null, error: rpcError.message }

  // Fetch the created couple to return it
  const { data: couple, error: fetchError } = await supabase.from('couples').select('*').eq('id', coupleId).single()

  if (fetchError) {
    // Couple was created but we can't fetch it via RLS — construct minimal response
    return { data: { id: coupleId, name: name ?? null } as DbCouple, error: null }
  }

  return { data: couple, error: null }
}

export async function getCouple(): Promise<{ data: DbCouple | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()

  if (!profile?.couple_id) return { data: null, error: null }

  const { data: couple, error } = await supabase.from('couples').select('*').eq('id', profile.couple_id).single()

  if (error) return { data: null, error: error.message }
  return { data: couple, error: null }
}

export async function getPartner(): Promise<{ data: DbProfile | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()

  if (!profile?.couple_id) return { data: null, error: 'Not in a couple' }

  const { data: partner, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('couple_id', profile.couple_id)
    .neq('id', user.id)
    .single()

  if (error) return { data: null, error: error.message }
  return { data: partner, error: null }
}

export async function joinCouple(coupleId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('profiles').update({ couple_id: coupleId }).eq('id', user.id)

  if (error) return { error: error.message }
  return { error: null }
}

export async function leaveCouple(): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('profiles').update({ couple_id: null }).eq('id', user.id)

  if (error) return { error: error.message }
  return { error: null }
}

export async function createInvite(
  email: string,
  existingClient?: SupabaseClient,
): Promise<{
  data: DbCoupleInvite | null
  error: string | null
}> {
  const supabase = existingClient ?? (await createClient())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()

  if (!profile?.couple_id) return { data: null, error: 'Not in a couple' }

  const token = crypto.randomUUID()

  const { data, error } = await supabase
    .from('couple_invites')
    .insert({
      couple_id: profile.couple_id,
      invited_by: user.id,
      invited_email: email,
      token,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function resendInvite(inviteId: string): Promise<{ data: DbCoupleInvite | null; error: string | null }> {
  const supabase = await createClient()

  const newToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('couple_invites')
    .update({
      token: newToken,
      status: 'pending' as const,
      expires_at: expiresAt,
    })
    .eq('id', inviteId)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// --- Admin operations (bypasses RLS) ---

export type InviteValidationStatus = 'valid' | 'accepted' | 'expired' | 'not_found'

export async function getInviteStatusByToken(token: string): Promise<{
  status: InviteValidationStatus
  invite: DbCoupleInvite | null
}> {
  const admin = createAdminClient()

  const { data: invite } = await admin.from('couple_invites').select('*').eq('token', token).single()

  if (!invite) {
    return { status: 'not_found', invite: null }
  }

  if (invite.status === 'accepted') {
    return { status: 'accepted', invite }
  }

  if (invite.status === 'expired' || new Date(invite.expires_at) <= new Date()) {
    return { status: 'expired', invite }
  }

  return { status: 'valid', invite }
}

export async function acceptInvite(token: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: invite, error: inviteError } = await admin
    .from('couple_invites')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (inviteError || !invite) return { error: inviteError?.message ?? 'Invite not found or expired' }

  // Add user to the couple
  const { error: joinError } = await admin.from('profiles').update({ couple_id: invite.couple_id }).eq('id', user.id)

  if (joinError) return { error: joinError.message }

  // Mark invite as accepted
  const { error: updateError } = await admin
    .from('couple_invites')
    .update({ status: 'accepted' as const })
    .eq('id', invite.id)

  if (updateError) return { error: updateError.message }

  return { error: null }
}
