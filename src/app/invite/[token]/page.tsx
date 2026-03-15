import { redirect } from 'next/navigation'

import { getUserOrNull } from '@/lib/auth'
import type { InviteValidationStatus } from '@/lib/couples'

import { validateInvite } from './actions'
import { InviteAcceptForm } from './invite-accept-form'

function getInviteErrorConfig(
  reason: InviteValidationStatus,
  error: string | null,
): { title: string; message: string; linkHref: string; linkText: string } {
  if (error) {
    return {
      title: 'Invalid Invite',
      message: error,
      linkHref: '/login',
      linkText: 'Go to Login',
    }
  }

  switch (reason) {
    case 'accepted':
      return {
        title: 'Invite Already Accepted',
        message: 'This invite has already been accepted. Go to your dashboard.',
        linkHref: '/dashboard',
        linkText: 'Go to Dashboard',
      }
    case 'expired':
      return {
        title: 'Invite Expired',
        message: 'This invite has expired. Ask your partner to send a new one.',
        linkHref: '/login',
        linkText: 'Go to Login',
      }
    case 'not_found':
    default:
      return {
        title: 'Invalid Invite',
        message: 'This invite link is invalid. Check with your partner.',
        linkHref: '/login',
        linkText: 'Go to Login',
      }
  }
}

type Props = {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const user = await getUserOrNull()
  const { valid, error, reason } = await validateInvite(token)

  if (!valid) {
    const errorConfig = getInviteErrorConfig(reason, error)

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 to-orange-50 p-4 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md space-y-4 rounded-2xl bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">{errorConfig.title}</h1>
          <p className="text-sm text-muted-foreground">{errorConfig.message}</p>
          <a
            href={errorConfig.linkHref}
            className="touch-target gradient-primary inline-block rounded-xl px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            {errorConfig.linkText}
          </a>
        </div>
      </div>
    )
  }

  if (!user) {
    const signupUrl = `/signup?redirect=${encodeURIComponent(`/invite/${token}`)}`
    redirect(signupUrl)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 to-orange-50 p-4 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-card p-8 text-center shadow-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">You have been invited!</h1>
          <p className="text-sm text-muted-foreground">
            Join your partner on QC to start your relationship wellness journey together.
          </p>
        </div>
        <InviteAcceptForm token={token} />
      </div>
    </div>
  )
}
