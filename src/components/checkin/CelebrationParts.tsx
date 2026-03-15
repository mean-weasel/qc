'use client'

import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Trophy, Smile, Meh } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'

export function CelebrationHeader(): React.ReactNode {
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

export interface SessionStatsProps {
  show: boolean
  topicCount: number
  timeSpent: number
  actionItemsCount: number
  notesCount: number
}

export function SessionStats({
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

export interface MoodIndicatorProps {
  moodBefore: number
  moodAfter: number
  show: boolean
}

export function MoodIndicator({ moodBefore, moodAfter, show }: MoodIndicatorProps): React.ReactNode {
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
