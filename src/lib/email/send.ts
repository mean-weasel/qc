import type { ReactElement } from 'react'

import { createAdminClient } from '@/lib/supabase/admin'
import { createRateLimiter } from '@/lib/rate-limit'

import { getResend, EMAIL_FROM, BATCH_SIZE } from './resend'
import { WaitlistConfirmationEmail } from './templates/waitlist-confirmation'

const emailDailyLimiter = createRateLimiter({ maxRequests: 50, windowSeconds: 86400 })

interface SendEmailParams {
  to: string
  subject: string
  react: ReactElement
  coupleId?: string
}

interface SendEmailResult {
  data: { id: string } | null
  error: { message: string } | null
}

export async function sendEmail({ to, subject, react, coupleId }: SendEmailParams): Promise<SendEmailResult> {
  if (coupleId) {
    const allowed = await emailDailyLimiter.check(`email:daily:${coupleId}`)
    if (!allowed) {
      return { data: null, error: { message: 'Daily email limit reached for this couple' } }
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tryqc.co'

  const { data, error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    react,
    headers: {
      'List-Unsubscribe': `<${baseUrl}/api/email/unsubscribe?email=${encodeURIComponent(to)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })

  return { data, error }
}

interface BatchEmailParams {
  recipients: string[]
  subject: string
  react: ReactElement
}

interface BatchEmailResult {
  sent: number
  failed: number
  errors: string[]
}

/** @public */
export async function sendBatchEmails({ recipients, subject, react }: BatchEmailParams): Promise<BatchEmailResult> {
  const result: BatchEmailResult = { sent: 0, failed: 0, errors: [] }

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE)
    const emails = batch.map((to) => ({
      from: EMAIL_FROM,
      to,
      subject,
      react,
    }))

    const { error } = await getResend().batch.send(emails)

    if (error) {
      result.failed += batch.length
      result.errors.push(error.message)
    } else {
      result.sent += batch.length
    }
  }

  return result
}

/**
 * Send waitlist confirmation email to a new waitlist subscriber.
 * Not couple-scoped — waitlist users have no profiles row.
 */
export async function sendWaitlistConfirmation(email: string, name?: string): Promise<SendEmailResult> {
  const { data, error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "You're on the QC waitlist!",
    react: WaitlistConfirmationEmail({ name }),
  })

  return { data, error }
}

/**
 * Check if we should send email to this address.
 * Returns false if the profile has bounced, complained, or opted out.
 */
export async function shouldSendEmail(email: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('email_bounced_at, email_complained_at, email_opted_out_at')
    .eq('email', email)
    .maybeSingle()

  if (!data) return true // Unknown email — allow sending (e.g., invite to non-user)
  if (data.email_bounced_at) return false
  if (data.email_complained_at) return false
  if (data.email_opted_out_at) return false
  return true
}
