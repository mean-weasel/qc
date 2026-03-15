'use server'

import { requireAuth } from '@/lib/auth'
import { sendEmail, shouldSendEmail } from '@/lib/email/send'
import { CheckInSummaryEmail } from '@/lib/email/templates/checkin-summary'
import { createRateLimiter } from '@/lib/rate-limit'

const checkInLimiter = createRateLimiter({ maxRequests: 10, windowSeconds: 86400 })

const MOOD_LABELS: Record<number, string> = {
  1: 'Struggling',
  2: 'Not Great',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
}

const CATEGORY_LABELS: Record<string, string> = {
  emotional: 'Emotional Connection',
  communication: 'Communication',
  intimacy: 'Physical & Emotional Intimacy',
  goals: 'Shared Goals & Future',
}

export async function checkCheckInRateLimit(): Promise<{ allowed: boolean; error?: string }> {
  const { user, supabase } = await requireAuth()

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()

  if (!profile?.couple_id) {
    return { allowed: false, error: 'You must be in a couple to start a check-in' }
  }

  const allowed = await checkInLimiter.check(`checkin:create:${profile.couple_id}`)
  if (!allowed) {
    return { allowed: false, error: 'Daily check-in limit reached. Please try again tomorrow.' }
  }

  return { allowed: true }
}

export async function sendCheckInSummaryEmail(checkInId: string): Promise<void> {
  try {
    const { supabase } = await requireAuth()

    const { data: checkIn, error: checkInError } = await supabase
      .from('check_ins')
      .select('couple_id, categories, mood_before, mood_after')
      .eq('id', checkInId)
      .single()

    if (checkInError || !checkIn) return

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .eq('couple_id', checkIn.couple_id)

    if (profilesError || !profiles || profiles.length !== 2) return

    const { data: actionItems } = await supabase.from('action_items').select('id').eq('check_in_id', checkInId)

    const actionItemCount = actionItems?.length ?? 0
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const notesUrl = `${baseUrl}/notes`

    const categoryNames = (checkIn.categories ?? []).map(
      (cat: string) => CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat,
    )

    for (const profile of profiles) {
      if (!profile.email) continue

      const canSend = await shouldSendEmail(profile.email)
      if (!canSend) continue

      const yourMood = MOOD_LABELS[checkIn.mood_before as keyof typeof MOOD_LABELS] ?? 'Unknown'
      const partnerMood = MOOD_LABELS[checkIn.mood_after as keyof typeof MOOD_LABELS] ?? 'Unknown'

      await sendEmail({
        to: profile.email,
        subject: 'Check-In Complete',
        react: CheckInSummaryEmail({
          yourMood,
          partnerMood,
          categories: categoryNames,
          actionItemCount,
          notesUrl,
        }),
      })
    }
  } catch {
    // Email send failed -- non-blocking
  }
}
