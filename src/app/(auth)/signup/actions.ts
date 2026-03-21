'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createRateLimiter } from '@/lib/rate-limit'
import { sendWaitlistConfirmation } from '@/lib/email/send'
import { getResend } from '@/lib/email/resend'
import { serverTrackWaitlistSignupCompleted, serverTrackWaitlistSignupFailed } from '@/lib/analytics-server'

const waitlistSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(255),
  name: z.string().max(100).optional(),
  source: z.string().max(50).optional().default('signup_page'),
})

const waitlistRateLimiter = createRateLimiter({ maxRequests: 5, windowSeconds: 3600 })

interface JoinWaitlistResult {
  success: boolean
  error?: string
}

export async function joinWaitlist(input: {
  email: string
  name?: string
  source?: string
}): Promise<JoinWaitlistResult> {
  // 1. Validate
  const parsed = waitlistSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message
    serverTrackWaitlistSignupFailed(input.email || 'unknown', 'validation')
    return { success: false, error: firstError || 'Invalid input' }
  }
  const { email, name, source } = parsed.data

  // 2. Rate limit by IP
  const headersList = await headers()
  const ip = headersList.get('x-real-ip') || headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const allowed = await waitlistRateLimiter.check(`waitlist:ip:${ip}`)
  if (!allowed) {
    serverTrackWaitlistSignupFailed(email, 'rate_limit')
    return { success: false, error: 'Too many attempts. Please try again later.' }
  }

  // 3. Duplicate check (return success silently to avoid info leak)
  const supabase = createAdminClient()
  const { data: existing } = await supabase.from('waitlist').select('id').eq('email', email.toLowerCase()).maybeSingle()

  if (existing) {
    return { success: true }
  }

  // 4. Insert
  const { error: insertError } = await supabase
    .from('waitlist')
    .insert({ email: email.toLowerCase(), name: name || null, source })

  if (insertError) {
    // 23505 = unique violation (race condition defense)
    if (insertError.code === '23505') {
      return { success: true }
    }
    console.error('Waitlist insert failed:', insertError)
    serverTrackWaitlistSignupFailed(email, 'insert_error')
    return { success: false, error: 'Something went wrong. Please try again.' }
  }

  // 5. Add to Resend waitlist segment (best-effort)
  const segmentId = process.env.RESEND_WAITLIST_AUDIENCE_ID
  if (segmentId) {
    try {
      await getResend().contacts.create({
        email: email.toLowerCase(),
        firstName: name || undefined,
        unsubscribed: false,
        segments: [{ id: segmentId }],
      })
    } catch (err) {
      console.error('Failed to add waitlist contact to Resend:', err)
    }
  }

  // 6. Send confirmation email (best-effort)
  try {
    await sendWaitlistConfirmation(email, name || undefined)
  } catch (err) {
    console.error('Failed to send waitlist confirmation:', err)
  }

  // 7. Track
  serverTrackWaitlistSignupCompleted(email, source)

  return { success: true }
}
