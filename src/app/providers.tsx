'use client'

import { Toaster } from 'sonner'
import { MotionConfig } from 'framer-motion'

import { ThemeProvider } from '@/contexts/ThemeContext'
import { PostHogWrapper } from '@/components/PostHogWrapper'
import { CookieConsent } from '@/components/ui/CookieConsent'

export function Providers({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <PostHogWrapper>
          {children}
          <CookieConsent />
        </PostHogWrapper>
        <Toaster position="top-center" richColors />
      </MotionConfig>
    </ThemeProvider>
  )
}
