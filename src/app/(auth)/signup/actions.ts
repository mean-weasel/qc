'use server'

import { headers } from 'next/headers'
import { z } from 'zod'

import { createRateLimiter } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWaitlistConfirmation } from '@/lib/email/send'
import { getResend } from '@/lib/email/resend'

const waitlistSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
  source: z.string().optional(),
})

const waitlistLimiter = createRateLimiter({
  maxRequests: 5,
  windowSeconds: 3600,
})

export async function joinWaitlist(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const raw = {
    email: formData.get('email'),
    name: formData.get('name') ?? undefined,
    source: formData.get('source') ?? undefined,
  }

  const parsed = waitlistSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { email, name, source } = parsed.data

  const headersList = await headers()
  const ip = headersList.get('x-real-ip') ?? headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const allowed = await waitlistLimiter.check(`waitlist:${ip}`)
  if (!allowed) {
    return { success: false, error: 'Too many attempts. Please try again later.' }
  }

  const supabase = createAdminClient()

  // Duplicate check — return success silently to avoid info leak
  const { data: existing } = await supabase.from('waitlist').select('id').eq('email', email).maybeSingle()
  if (existing) {
    return { success: true }
  }

  // Insert into waitlist table
  const { error: insertError } = await supabase.from('waitlist').insert({ email, name, source })
  if (insertError) {
    return { success: false, error: 'Failed to join waitlist. Please try again.' }
  }

  // Add to Resend audience (non-blocking)
  const audienceId = process.env.RESEND_WAITLIST_AUDIENCE_ID
  if (audienceId) {
    try {
      await getResend().contacts.create({ audienceId, email, firstName: name })
    } catch {
      // Non-blocking — ignore Resend audience errors
    }
  }

  // Send confirmation email (non-blocking)
  try {
    await sendWaitlistConfirmation(email, name)
  } catch {
    // Non-blocking — email failure doesn't fail the signup
  }

  return { success: true }
}
