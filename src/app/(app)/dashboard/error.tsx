'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorPageProps): React.ReactNode {
  useEffect(() => {
    console.error('Dashboard error:', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-16 w-16 text-amber-500 mb-6" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Unable to load dashboard</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
        Something went wrong loading your dashboard. Please try again.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          Try Again
        </Button>
        <Button onClick={() => (window.location.href = '/dashboard')}>Go to Dashboard</Button>
      </div>
    </div>
  )
}
