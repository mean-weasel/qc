'use client'

import { useEffect, useState } from 'react'
import { celebrationBurst } from '@/lib/confetti'
import { hapticFeedback } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Sparkles, Trophy, Home, RefreshCw, Calendar, Smile, Meh } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'

function CelebrationHeader(): React.ReactNode {
  return (
    <div className="relative bg-gradient-to-r from-pink-500 to-purple-600 p-8 text-white">
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <Sparkles className="h-64 w-64" />
      </div>
      <div className="relative z-10 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.5, stiffness: 300 }}
        >
          <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-300" />
        </motion.div>
        <motion.h2
          className="text-3xl font-bold mb-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Check-in Complete!
        </motion.h2>
        <motion.p
          className="text-lg opacity-95"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Great job taking time for your relationship!
        </motion.p>
      </div>
    </div>
  )
}

interface SessionStatsProps {
  show: boolean
  topicCount: number
  timeSpent: number
  actionItemsCount: number
  notesCount: number
}

function formatDuration(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

function AnimatedStat({
  value,
  label,
  color,
  isTime,
}: {
  value: number
  label: string
  color: string
  isTime?: boolean
}): React.ReactNode {
  const animated = useCountUp(value, 1200)
  return (
    <div>
      <div className={cn('text-2xl font-bold', color)}>{isTime ? formatDuration(animated) : animated}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function SessionStats({
  show,
  topicCount,
  timeSpent,
  actionItemsCount,
  notesCount,
}: SessionStatsProps): React.ReactNode {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="p-6 bg-muted border-t border-border"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Session Summary</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <AnimatedStat value={topicCount} label="Topics Discussed" color="text-purple-600" />
            <AnimatedStat value={timeSpent} label="Time Together" color="text-pink-600" isTime />
            <AnimatedStat value={actionItemsCount} label="Action Items" color="text-indigo-600" />
            <AnimatedStat value={notesCount} label="Notes Taken" color="text-emerald-600" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface MoodIndicatorProps {
  moodBefore: number
  moodAfter: number
  show: boolean
}

function MoodIndicator({ moodBefore, moodAfter, show }: MoodIndicatorProps): React.ReactNode {
  const improved = moodAfter > moodBefore
  const same = moodAfter === moodBefore
  if (!improved && !same) return null

  const colorClass = improved
    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
    : 'bg-muted text-muted-foreground'
  const Icon = improved ? Smile : Meh
  const text = improved ? 'Your mood improved!' : 'Your mood stayed consistent'

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            'mx-6 mt-0 mb-2 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
            colorClass,
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.3 }}
        >
          <Icon className="h-4 w-4" />
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

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
