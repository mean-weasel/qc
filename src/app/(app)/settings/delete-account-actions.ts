'use server'

import { z } from 'zod'

import { requireAuth } from '@/lib/auth'
import { createRateLimiter } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { validate } from '@/lib/validation'

const deleteAccountLimiter = createRateLimiter({ maxRequests: 3, windowSeconds: 3600 })

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

export async function deleteAccount({ password }: { password: string }): Promise<{ error: string | null }> {
  const { user, supabase } = await requireAuth()

  const { error: validationError } = validate(deleteAccountSchema, { password })
  if (validationError) return { error: validationError }

  const allowed = await deleteAccountLimiter.check(`delete-account:${user.id}`)
  if (!allowed) return { error: 'Too many attempts. Please try again later.' }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  })
  if (signInError) return { error: 'Incorrect password. Please try again.' }

  const admin = createAdminClient()
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) return { error: 'Failed to delete account. Please try again.' }

  await supabase.auth.signOut()

  return { error: null }
}
