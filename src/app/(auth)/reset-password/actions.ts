'use server'

import { headers } from 'next/headers'
import { z } from 'zod'

import { createRateLimiter } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const resetPasswordLimiter = createRateLimiter({
  maxRequests: 5,
  windowSeconds: 3600,
})

export async function updatePassword(input: { password: string }): Promise<{ error: string | null }> {
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const headersList = await headers()
  const ip = headersList.get('x-real-ip') ?? headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await resetPasswordLimiter.check(`reset-password:${ip}`)
  if (!allowed) {
    return { error: 'Too many requests. Please try again later.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}
