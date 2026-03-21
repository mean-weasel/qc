'use server'

import { headers } from 'next/headers'
import { z } from 'zod'

import { createRateLimiter } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const loginLimiter = createRateLimiter({
  maxRequests: 10,
  windowSeconds: 900,
})

export async function loginWithPassword(input: { email: string; password: string }): Promise<{ error: string | null }> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const headersList = await headers()
  const ip = headersList.get('x-real-ip') ?? headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await loginLimiter.check(`login:${ip}`)
  if (!allowed) {
    return { error: 'Too many login attempts. Please try again in a few minutes.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}
