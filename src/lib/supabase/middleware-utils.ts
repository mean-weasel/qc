import { type NextResponse } from 'next/server'

export const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/auth/callback',
  '/api/health',
  '/api/email/webhook',
  '/api/email/unsubscribe',
  '/api/cron',
  '/onboarding',
  '/invite',
  '/privacy',
  '/terms',
  '/.well-known',
  '/forgot-password',
  '/reset-password',
]

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))
}

export function isAppRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/checkin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/growth') ||
    pathname.startsWith('/love-languages') ||
    pathname.startsWith('/notes') ||
    pathname.startsWith('/reminders') ||
    pathname.startsWith('/requests') ||
    pathname.startsWith('/settings')
  )
}

export function isAllowedEmail(email: string): boolean {
  const allowedEmails = process.env.ALLOWED_EMAILS
  if (!allowedEmails) return true // no restriction if env var not set
  const list = allowedEmails.split(',').map((e) => e.trim().toLowerCase())
  return list.includes(email.toLowerCase())
}

export function addSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Next.js uses inline scripts for hydration data (self.__next_f.push).
  // Capacitor WKWebView also injects inline scripts for the native bridge.
  // Without 'unsafe-inline', pages fail to hydrate in the browser.
  const isDev = process.env.NODE_ENV === 'development'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const extraConnectSrc = supabaseUrl && !supabaseUrl.includes('.supabase.co') ? ` ${supabaseUrl}` : ''

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: https://*.supabase.co${extraConnectSrc}`,
    "font-src 'self'",
    `connect-src 'self' https://*.supabase.co${extraConnectSrc}${isDev ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)
}
