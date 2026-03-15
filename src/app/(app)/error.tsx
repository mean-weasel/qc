'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps): React.ReactNode {
  const router = useRouter()

  useEffect(() => {
    console.error('App error:', error)
    Sentry.captureException(error)
  }, [error])

  function handleRetry(): void {
    router.refresh()
    reset()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-16 w-16 text-amber-500 mb-6" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Something went wrong</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
        We hit an unexpected error. You can try again or head back to the dashboard.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleRetry}>
          Try Again
        </Button>
        <Button onClick={() => (window.location.href = '/dashboard')}>Go Home</Button>
      </div>
      {process.env.NODE_ENV === 'development' && error.message && (
        <pre className="mt-8 max-w-lg overflow-auto rounded-lg bg-gray-100 dark:bg-gray-800 p-4 text-left text-xs text-gray-700 dark:text-gray-300">
          {error.message}
        </pre>
      )}
    </div>
  )
}
