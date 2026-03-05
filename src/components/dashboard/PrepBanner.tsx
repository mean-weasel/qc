'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { MessageCircle, X, Sparkles, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MotionBox, AnimatePresence } from '@/components/ui/motion'

const DISMISS_KEY = 'qc-prep-banner-dismissed'

interface PrepBannerProps {
  lastCheckInDate?: string | null
  className?: string
}

function getDaysSinceCheckIn(dateStr: string): number {
  const last = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - last.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function getBannerContent(lastCheckInDate?: string | null): { heading: string; message: string; urgent: boolean } {
  if (!lastCheckInDate) {
    return {
      heading: 'Start your first check-in!',
      message: 'Kick off your relationship journey with a meaningful conversation.',
      urgent: true,
    }
  }

  const days = getDaysSinceCheckIn(lastCheckInDate)

  if (days >= 14) {
    return {
      heading: 'We miss you!',
      message: `It's been ${days} days since your last check-in. Reconnect with your partner today.`,
      urgent: true,
    }
  }

  if (days >= 7) {
    return {
      heading: 'Time for a check-in!',
      message: `It's been ${days} days. A weekly check-in keeps your connection strong.`,
      urgent: true,
    }
  }

  return {
    heading: 'Keep up the momentum!',
    message: 'Your recent check-in was great. Ready for another meaningful conversation?',
    urgent: false,
  }
}

function subscribeToStorage(callback: () => void): () => void {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

function getStorageSnapshot(): boolean {
  return sessionStorage.getItem(DISMISS_KEY) === 'true'
}

function getServerSnapshot(): boolean {
  return true // hidden during SSR
}

export function PrepBanner({ lastCheckInDate, className }: PrepBannerProps): React.ReactNode {
  const storageDismissed = useSyncExternalStore(subscribeToStorage, getStorageSnapshot, getServerSnapshot)
  const [localDismissed, setLocalDismissed] = useState(false)
  const dismissed = storageDismissed || localDismissed

  function handleDismiss(): void {
    setLocalDismissed(true)
    sessionStorage.setItem(DISMISS_KEY, 'true')
  }

  const { heading, message, urgent } = getBannerContent(lastCheckInDate)

  return (
    <AnimatePresence>
      {!dismissed && (
        <MotionBox variant="fade" className={cn(className)}>
          <div
            className={cn(
              'relative overflow-hidden rounded-lg p-6 shadow-md',
              urgent
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 dark:from-rose-600 dark:to-pink-600'
                : 'bg-gradient-to-r from-pink-400 to-rose-400 dark:from-pink-500 dark:to-rose-500',
            )}
          >
            {/* Decorative background element */}
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute -right-2 bottom-0 h-16 w-16 rounded-full bg-white/5" />

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-white/70 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
                  {urgent ? <Clock className="h-5 w-5 text-white" /> : <Sparkles className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{heading}</h3>
                  <p className="mt-1 text-sm text-white/90">{message}</p>
                </div>
              </div>

              <Link href="/checkin" className="shrink-0">
                <Button
                  variant="secondary"
                  className="w-full bg-white text-pink-600 hover:bg-white/90 dark:bg-white dark:text-pink-600 dark:hover:bg-white/90 sm:w-auto"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Start Check-in
                </Button>
              </Link>
            </div>
          </div>
        </MotionBox>
      )}
    </AnimatePresence>
  )
}
