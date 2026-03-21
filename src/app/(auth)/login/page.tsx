'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { loginWithPassword } from './actions'
import { sanitizeRedirect } from '@/lib/redirect'
import { createClient } from '@/lib/supabase/client'

function OAuthButtons({ onOAuth }: { onOAuth: (provider: 'google' | 'github') => void }): React.ReactElement {
  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-input" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-muted/50 px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onOAuth('google')}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2.5 text-base min-h-[44px] font-medium text-foreground hover:bg-muted/50"
        >
          Google
        </button>
        <button
          type="button"
          onClick={() => onOAuth('github')}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2.5 text-base min-h-[44px] font-medium text-foreground hover:bg-muted/50"
        >
          GitHub
        </button>
      </div>
    </>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = sanitizeRedirect(searchParams.get('redirect'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const allowedEmails = process.env.NEXT_PUBLIC_ALLOWED_EMAILS
    if (allowedEmails) {
      const list = allowedEmails.split(',').map((e) => e.trim().toLowerCase())
      if (!list.includes(email.toLowerCase())) {
        setError('Access restricted to approved accounts only.')
        setLoading(false)
        return
      }
    }

    const result = await loginWithPassword({ email, password })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  function handleOAuth(provider: 'google' | 'github'): void {
    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin

    void supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${appUrl}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in to your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Or{' '}
            <Link
              href="/signup"
              className="font-medium text-primary hover:text-primary/80 inline-flex items-center min-h-[44px]"
            >
              create a new account
            </Link>
          </p>
        </div>

        {error && (
          <div
            id="login-error"
            role="alert"
            aria-live="polite"
            className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? 'login-error' : undefined}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              aria-required="true"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input px-3 py-2.5 text-base min-h-[44px] shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              aria-required="true"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input px-3 py-2.5 text-base min-h-[44px] shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Your password"
            />
          </div>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-base min-h-[44px] font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <OAuthButtons onOAuth={handleOAuth} />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
