'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, TrendingUp, ArrowRight, ChevronDown } from 'lucide-react'
import { staggerContainer, slideUp, staggerItem } from '@/lib/animations'
import { Button } from '@/components/ui/button'
import { trackCtaClicked } from '@/lib/analytics'

const FEATURES = [
  { icon: MessageCircle, text: 'Structured Sessions' },
  { icon: Heart, text: 'Relationship Reminders' },
  { icon: TrendingUp, text: 'Progress Tracking' },
] as const

export function Hero(): React.ReactNode {
  return (
    <section className="min-h-[80vh] flex items-center justify-center px-2 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Soft romantic background */}
      <div className="absolute inset-0 gradient-blush opacity-50 dark:opacity-10" />
      <div className="absolute inset-0 bg-gradient-to-br from-rose-50/80 via-pink-50/80 to-orange-50/80 dark:from-rose-950/30 dark:via-pink-950/30 dark:to-orange-950/30" />

      <motion.div
        className="w-full sm:max-w-4xl mx-auto text-center relative z-10"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Main Headline */}
        <motion.h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6" variants={slideUp}>
          <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 bg-clip-text text-transparent">
            Quality Control
          </span>
          <span className="block bg-gradient-to-r from-rose-400 to-pink-500 bg-clip-text text-transparent mt-2">
            for your relationship
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed"
          variants={staggerItem}
        >
          Simple tools to build a stronger relationship together.
        </motion.p>

        {/* Feature Pills */}
        <motion.div className="flex flex-wrap justify-center gap-3 mb-12" variants={staggerContainer}>
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={index}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 dark:bg-white/10 border border-rose-200/50 dark:border-rose-500/20 text-sm font-medium text-foreground hover:shadow-lg hover:border-rose-300/50 transition-all cursor-pointer backdrop-blur-sm"
                variants={staggerItem}
                whileHover={{ scale: 1.05 }}
              >
                <Icon className="w-4 h-4 text-[hsl(var(--primary))]" />
                {feature.text}
              </motion.div>
            )
          })}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div className="flex flex-col sm:flex-row gap-4 justify-center items-center" variants={staggerItem}>
          <Button
            size="lg"
            className="px-8 py-4 text-lg font-semibold group gradient-primary text-white border-0 shadow-lg shadow-rose-200/50 hover:shadow-xl hover:shadow-rose-300/50 transition-all"
            asChild
          >
            <Link
              href="/signup"
              className="flex items-center gap-2"
              onClick={() => trackCtaClicked('hero', 'Start your journey')}
            >
              Start your journey
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="border-2 border-rose-300 dark:border-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 shadow-md hover:shadow-lg transition-all px-8 py-4 text-lg font-semibold"
            asChild
          >
            <a href="#features" onClick={() => trackCtaClicked('hero', 'Learn more')}>
              Learn more
            </a>
          </Button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="mt-12"
          variants={staggerItem}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className="w-6 h-6 mx-auto" />
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}
