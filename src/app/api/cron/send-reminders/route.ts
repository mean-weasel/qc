import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

import { sendEmail } from '@/lib/email/send'
import { ReminderEmail } from '@/lib/email/templates/reminder'
import { createAdminClient } from '@/lib/supabase/admin'

function timingSafeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest()
  const hashB = crypto.createHash('sha256').update(b).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  const expectedHeader = `Bearer ${process.env.CRON_SECRET}`

  // Timing-safe comparison to prevent timing attacks
  if (!authHeader || !process.env.CRON_SECRET || !timingSafeCompare(authHeader, expectedHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Query active reminders that are due and have email notifications
  const REMINDERS_CAP = 200
  const { data: reminders, error: queryError } = await supabase
    .from('reminders')
    .select('id, couple_id, created_by, title, message, notification_channel')
    .eq('is_active', true)
    .in('notification_channel', ['email', 'both'])
    .lte('scheduled_for', now)
    .limit(REMINDERS_CAP)

  if (queryError) {
    console.error('[cron/send-reminders]', queryError.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  if (reminders && reminders.length >= REMINDERS_CAP) {
    console.warn(`[cron/send-reminders] Result hit cap of ${REMINDERS_CAP} -- some reminders may be deferred`)
  }

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({
      status: 'ok',
      sent: 0,
      timestamp: now,
    })
  }

  // Get unique user IDs that need emails
  const userIds = [...new Set(reminders.map((r) => r.created_by))]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, email_unsubscribe_token, email_bounced_at, email_complained_at, email_opted_out_at')
    .in('id', userIds)

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? [])

  let sent = 0
  let failed = 0
  const errors: string[] = []
  const sentReminderIds: string[] = []

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tryqc.co'

  for (const reminder of reminders) {
    const profile = profileMap.get(reminder.created_by)
    if (!profile?.email) continue

    // Skip bounced, complained, or opted-out emails (inline check avoids redundant DB query)
    if (profile.email_bounced_at || profile.email_complained_at || profile.email_opted_out_at) continue

    const unsubscribeUrl = profile.email_unsubscribe_token
      ? `${baseUrl}/api/email/unsubscribe/${profile.email_unsubscribe_token}`
      : undefined

    const { error: sendError } = await sendEmail({
      to: profile.email,
      subject: `Reminder: ${reminder.title}`,
      react: ReminderEmail({
        title: reminder.title,
        message: reminder.message ?? `Your reminder "${reminder.title}" is due.`,
        dashboardUrl: `${baseUrl}/reminders`,
        unsubscribeUrl,
      }),
    })

    if (sendError) {
      failed++
      errors.push(`${reminder.id}: ${sendError.message}`)
    } else {
      sent++
      sentReminderIds.push(reminder.id)
    }
  }

  // Deactivate one-time reminders that were actually sent
  if (sentReminderIds.length > 0) {
    await supabase.from('reminders').update({ is_active: false }).in('id', sentReminderIds).eq('frequency', 'once')
  }

  // Clean up expired rate limit entries opportunistically
  await supabase.rpc('cleanup_expired_rate_limits')

  return NextResponse.json({
    status: 'ok',
    sent,
    failed,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: now,
  })
}
