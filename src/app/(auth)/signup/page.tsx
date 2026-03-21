'use client'

import { useState } from 'react'
import { WaitlistForm } from './WaitlistForm'
import { SignupForm } from './SignupForm'

function isBetaGateEnabled(): boolean {
  const allowed = process.env.NEXT_PUBLIC_ALLOWED_EMAILS
  return Boolean(allowed && allowed.trim().length > 0)
}

export default function SignupPage(): React.ReactNode {
  const [allowedEmail, setAllowedEmail] = useState<string | null>(null)

  // Show waitlist form if gate is enabled and user hasn't been identified as allowed
  if (isBetaGateEnabled() && allowedEmail === null) {
    return <WaitlistForm onAllowedEmail={(email) => setAllowedEmail(email)} />
  }

  return <SignupForm defaultEmail={allowedEmail ?? ''} />
}
