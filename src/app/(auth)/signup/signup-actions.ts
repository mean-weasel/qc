'use server'

import { headers } from 'next/headers'
import { z } from 'zod'

import { createRateLimiter } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const signupSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const signupLimiter = createRateLimiter({
  maxRequests: 5,
  windowSeconds: 3600,
})

export async function signupWithPassword(input: {
  displayName: string
  email: string
  password: string
}): Promise<{ error: string | null }> {
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const headersList = await headers()
  const ip = headersList.get('x-real-ip') ?? headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await signupLimiter.check(`signup:${ip}`)
  if (!allowed) {
    return { error: 'Too many signup attempts. Please try again later.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.displayName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}
