'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { CheckInProvider } from '@/contexts/CheckInContext'
import { BookendsProvider } from '@/contexts/BookendsContext'
import { SessionSettingsProvider } from '@/contexts/SessionSettingsContext'
import { LoveLanguagesProvider } from '@/contexts/LoveLanguagesContext'
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh'

interface AppProvidersProps {
  children: React.ReactNode
  coupleId: string
  userId: string
}

export function AppProviders({ children, coupleId, userId }: AppProvidersProps): React.ReactNode {
  const router = useRouter()
  useVisibilityRefresh(useCallback(() => router.refresh(), [router]))

  return (
    <CheckInProvider coupleId={coupleId} userId={userId}>
      <SessionSettingsProvider coupleId={coupleId}>
        <BookendsProvider coupleId={coupleId} userId={userId}>
          <LoveLanguagesProvider coupleId={coupleId} userId={userId}>
            {children}
          </LoveLanguagesProvider>
        </BookendsProvider>
      </SessionSettingsProvider>
    </CheckInProvider>
  )
}
