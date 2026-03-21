'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { joinWaitlist } from './actions'
import { trackWaitlistFormViewed, trackWaitlistSignupAttempted } from '@/lib/analytics'

interface WaitlistFormProps {
  onAllowedEmail?: (email: string) => void
}

export function WaitlistForm({ onAllowedEmail }: WaitlistFormProps): React.ReactNode {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    trackWaitlistFormViewed()
  }, [])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setLoading(true)
    trackWaitlistSignupAttempted()

    // Check if this email is in the allowed list
    const allowedEmails = process.env.NEXT_PUBLIC_ALLOWED_EMAILS
    if (allowedEmails) {
      const list = allowedEmails.split(',').map((e) => e.trim().toLowerCase())
      if (list.includes(email.toLowerCase())) {
        onAllowedEmail?.(email)
        setLoading(false)
        return
      }
    }

    const result = await joinWaitlist({ email, name: name || undefined })

    if (!result.success) {
      setError(result.error || 'Something went wrong.')
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
        <div className="w-full max-w-sm space-y-4 text-center" aria-live="polite">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">You're on the list!</h1>
          <p className="text-sm text-muted-foreground">
            We'll email <span className="font-medium">{email}</span> when your spot is ready.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center min-h-[44px] text-sm font-medium text-primary hover:text-primary/80"
          >
            Already have access? Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Join the waitlist</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            QC is in private beta. Join the waitlist to get early access.
          </p>
        </div>

        {error && (
          <div
            id="waitlist-error"
            role="alert"
            aria-live="polite"
            className="rounded-md bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? 'waitlist-error' : undefined}>
          <div>
            <label htmlFor="waitlist-email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="waitlist-email"
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
            <label htmlFor="waitlist-name" className="block text-sm font-medium text-foreground">
              Name <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="waitlist-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input px-3 py-2.5 text-base min-h-[44px] shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Your name"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-base min-h-[44px] font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join waitlist'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have access?{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary/80 inline-flex items-center min-h-[44px]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
