'use server'

import { headers } from 'next/headers'
import { z } from 'zod'

import { createRateLimiter } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

const forgotPasswordLimiter = createRateLimiter({
  maxRequests: 3,
  windowSeconds: 3600,
})

export async function requestPasswordReset(input: { email: string }): Promise<{ error: string | null }> {
  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const headersList = await headers()
  const ip = headersList.get('x-real-ip') ?? headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await forgotPasswordLimiter.check(`forgot-password:${ip}`)
  if (!allowed) {
    return { error: 'Too many requests. Please try again later.' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const supabase = await createClient()

  // Always return success to prevent email enumeration
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${baseUrl}/reset-password`,
  })

  return { error: null }
}
