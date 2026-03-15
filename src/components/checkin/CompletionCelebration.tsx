'use client'

import { useEffect, useState } from 'react'
import { celebrationBurst } from '@/lib/confetti'
import { hapticFeedback } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Home, RefreshCw, Calendar } from 'lucide-react'
import { CelebrationHeader, SessionStats, MoodIndicator } from './CelebrationParts'

function CelebrationContent(props: {
  categories: string[]
  timeSpent: number
  actionItemsCount: number
  notesCount: number
  moodBefore?: number | null
  moodAfter?: number | null
  onClose?: () => void
  onGoHome?: () => void
  onStartNew?: () => void
  isCompleting?: boolean
}): React.ReactNode {
  const {
    categories,
    timeSpent,
    actionItemsCount,
    notesCount,
    moodBefore,
    moodAfter,
    onClose,
    onGoHome,
    onStartNew,
    isCompleting,
  } = props
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    celebrationBurst()
    hapticFeedback.checkInComplete()
    const timer = setTimeout(() => setShowStats(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  const hasMoodData = moodBefore != null && moodAfter != null

  return (
    <motion.div
      className="w-full max-w-lg"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
    >
      <div className="bg-card rounded-2xl shadow-2xl overflow-hidden">
        <CelebrationHeader />
        <SessionStats
          show={showStats}
          topicCount={categories.length}
          timeSpent={timeSpent}
          actionItemsCount={actionItemsCount}
          notesCount={notesCount}
        />
        {hasMoodData && <MoodIndicator moodBefore={moodBefore} moodAfter={moodAfter} show={showStats} />}
        <div className="p-6 space-y-3">
          <div className="flex gap-3">
            {onGoHome && (
              <Button variant="outline" onClick={onGoHome} disabled={isCompleting} className="flex-1 gap-2">
                <Home className="h-4 w-4" />
                {isCompleting ? 'Saving...' : 'Go Home'}
              </Button>
            )}
            {onStartNew && (
              <Button
                onClick={onStartNew}
                disabled={isCompleting}
                className="flex-1 gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white"
              >
                <RefreshCw className="h-4 w-4" />
                {isCompleting ? 'Saving...' : 'Start Another'}
              </Button>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
      <motion.div
        className="mt-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <p className="text-sm text-muted-foreground">Your next check-in is recommended in</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Calendar className="h-4 w-4 text-purple-600" />
          <span className="font-medium text-purple-600">7 days</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

interface CompletionCelebrationProps {
  show: boolean
  categories?: string[]
  timeSpent?: number
  actionItemsCount?: number
  notesCount?: number
  moodBefore?: number | null
  moodAfter?: number | null
  onClose?: () => void
  onGoHome?: () => void
  onStartNew?: () => void
  isCompleting?: boolean
  className?: string
}

export function CompletionCelebration({
  show,
  categories = [],
  timeSpent = 0,
  actionItemsCount = 0,
  notesCount = 0,
  moodBefore,
  moodAfter,
  onClose,
  onGoHome,
  onStartNew,
  isCompleting,
  className,
}: CompletionCelebrationProps): React.ReactNode {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center p-4',
            'bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100',
            'dark:from-pink-950/30 dark:via-purple-950/30 dark:to-indigo-950/30',
            className,
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <CelebrationContent
            categories={categories}
            timeSpent={timeSpent}
            actionItemsCount={actionItemsCount}
            notesCount={notesCount}
            moodBefore={moodBefore}
            moodAfter={moodAfter}
            onClose={onClose}
            onGoHome={onGoHome}
            onStartNew={onStartNew}
            isCompleting={isCompleting}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
