import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'

import { createAdminClient } from '@/lib/supabase/admin'
import { createRateLimiter } from '@/lib/rate-limit'

const webhookLimiter = createRateLimiter({ maxRequests: 100, windowSeconds: 60 })

type ResendEventType = 'email.delivered' | 'email.bounced' | 'email.complained'

interface ResendWebhookPayload {
  type: ResendEventType
  data: {
    email_id: string
    to: string[]
    created_at: string
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  if (!(await webhookLimiter.check(ip))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 401 })
  }

  // Get Svix signature headers
  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 })
  }

  // Get raw request body for signature verification
  const body = await request.text()

  // Verify webhook signature
  const wh = new Webhook(webhookSecret)
  let payload: ResendWebhookPayload

  try {
    payload = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabase = createAdminClient()

  switch (payload.type) {
    case 'email.delivered': {
      break
    }

    case 'email.bounced': {
      for (const email of payload.data.to) {
        const { error } = await supabase
          .from('profiles')
          .update({ email_bounced_at: new Date().toISOString() })
          .eq('email', email)
        if (error) console.error('[webhook] Failed to record bounce:', error.message)
      }
      break
    }

    case 'email.complained': {
      for (const email of payload.data.to) {
        const { error } = await supabase
          .from('profiles')
          .update({ email_complained_at: new Date().toISOString() })
          .eq('email', email)
        if (error) console.error('[webhook] Failed to record complaint:', error.message)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
