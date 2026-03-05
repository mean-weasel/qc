'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import { Hero } from '@/components/Landing/Hero'
import { HowItWorks } from '@/components/Landing/HowItWorks'
import { SocialProof } from '@/components/Landing/SocialProof'
import { FeatureGrid } from '@/components/Landing/FeatureGrid'
import { Footer } from '@/components/Landing/Footer'

export function LandingPage(): React.ReactNode {
  return (
    <main id="main-content" className="overflow-hidden">
      {/* Minimal landing header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-500 fill-current" />
            <span className="text-xl font-semibold text-foreground">QC</span>
          </div>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg px-4 py-2 min-h-[44px] text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-lg bg-[hsl(var(--primary))] px-4 py-2 min-h-[44px] text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <Hero />
      <HowItWorks />
      <SocialProof />
      <FeatureGrid />
      <Footer />
    </main>
  )
}
