import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createRateLimiter } from '@/lib/rate-limit'

const unsubscribeLimiter = createRateLimiter({ maxRequests: 10, windowSeconds: 60 })

const RESPONSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html',
  'Cache-Control': 'no-store',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params
  const ip = _request.headers.get('x-forwarded-for') ?? 'unknown'
  if (!(await unsubscribeLimiter.check(ip))) {
    return new NextResponse('Too many requests', { status: 429 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!token || !UUID_RE.test(token)) {
    return new NextResponse(unsubscribePage('Invalid unsubscribe link.', false, baseUrl), {
      status: 400,
      headers: RESPONSE_HEADERS,
    })
  }

  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email_opted_out_at')
    .eq('email_unsubscribe_token', token)
    .maybeSingle()

  if (!profile) {
    return new NextResponse(unsubscribePage('Unsubscribe link not found or already expired.', false, baseUrl), {
      status: 404,
      headers: RESPONSE_HEADERS,
    })
  }

  if (profile.email_opted_out_at) {
    return new NextResponse(unsubscribePage('You are already unsubscribed from QC emails.', true, baseUrl), {
      headers: RESPONSE_HEADERS,
    })
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ email_opted_out_at: new Date().toISOString() })
    .eq('id', profile.id)

  if (updateError) {
    return new NextResponse(unsubscribePage('Something went wrong. Please try again later.', false, baseUrl), {
      status: 500,
      headers: RESPONSE_HEADERS,
    })
  }

  return new NextResponse(
    unsubscribePage(
      'You have been unsubscribed from QC emails. You can re-enable emails in your settings.',
      true,
      baseUrl,
    ),
    { headers: RESPONSE_HEADERS },
  )
}

/** Static-only message parameter — never pass user-controlled input */
function unsubscribePage(message: string, success: boolean, baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Unsubscribe - QC</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f9fafb}
.card{max-width:420px;padding:2rem;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);text-align:center}
h1{font-size:1.25rem;color:${success ? '#059669' : '#dc2626'};margin-bottom:.75rem}
p{color:#374151;line-height:1.6}
a{color:#e11d48;text-decoration:none}</style></head>
<body><div class="card"><h1>${success ? 'Unsubscribed' : 'Error'}</h1><p>${message}</p><p style="margin-top:1.5rem"><a href="${baseUrl}">Back to QC</a></p></div></body></html>`
}
