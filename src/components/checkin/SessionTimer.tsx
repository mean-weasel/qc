'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Pause, Play, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { hapticFeedback } from '@/lib/haptics'
import { SPRING_CONFIGS } from '@/lib/animations'

interface Props {
  /** Duration in minutes for the timer */
  durationMinutes: number
  /** Called when the timer reaches zero */
  onTimeUp?: () => void
  /** Whether to auto-start the timer on mount */
  autoStart?: boolean
  /** Enable haptic feedback when time is up */
  enableHaptics?: boolean
  /** Additional class names for the container */
  className?: string
}

type TimerPhase = 'green' | 'yellow' | 'red'

function getTimerPhase(timeRemaining: number, totalSeconds: number): TimerPhase {
  if (totalSeconds === 0) return 'green'
  const ratio = timeRemaining / totalSeconds
  if (ratio > 0.5) return 'green'
  if (ratio > 0.25) return 'yellow'
  return 'red'
}

const PHASE_STYLES: Record<TimerPhase, { text: string; bg: string; ring: string; icon: string }> = {
  green: {
    text: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
    icon: 'text-emerald-500 dark:text-emerald-400',
  },
  yellow: {
    text: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    ring: 'ring-amber-200 dark:ring-amber-800',
    icon: 'text-amber-500 dark:text-amber-400',
  },
  red: {
    text: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    ring: 'ring-red-200 dark:ring-red-800',
    icon: 'text-red-500 dark:text-red-400',
  },
} as const

function getPhaseStyles(phase: TimerPhase): (typeof PHASE_STYLES)[TimerPhase] {
  if (phase === 'yellow') return PHASE_STYLES.yellow
  if (phase === 'red') return PHASE_STYLES.red
  return PHASE_STYLES.green
}

export function SessionTimer({
  durationMinutes,
  onTimeUp,
  autoStart = false,
  enableHaptics = true,
  className,
}: Props): React.ReactNode {
  const totalSeconds = durationMinutes * 60
  const hasAutoStarted = useRef(false)

  const { timeRemaining, isRunning, isPaused, start, pause, resume, reset, formattedTime } = useSessionTimer({
    durationMinutes,
    onTimeUp: () => {
      if (enableHaptics) {
        hapticFeedback.warning()
      }
      onTimeUp?.()
    },
  })

  // Auto-start on mount if requested (only once)
  useEffect(() => {
    if (autoStart && !hasAutoStarted.current) {
      hasAutoStarted.current = true
      start()
    }
  }, [autoStart, start])

  const phase = getTimerPhase(timeRemaining, totalSeconds)
  const styles = getPhaseStyles(phase)
  const isInLastMinute = isRunning && !isPaused && timeRemaining > 0 && timeRemaining <= 60
  const isFinished = isRunning === false && timeRemaining === 0

  function handlePlayPause(): void {
    if (enableHaptics) {
      hapticFeedback.tap()
    }

    if (!isRunning) {
      start()
    } else if (isPaused) {
      resume()
    } else {
      pause()
    }
  }

  function handleReset(): void {
    if (enableHaptics) {
      hapticFeedback.tap()
    }
    reset()
  }

  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 ring-1 transition-colors duration-300',
        styles.bg,
        styles.ring,
        className,
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING_CONFIGS.snappy}
    >
      {/* Clock icon */}
      <Clock className={cn('h-4 w-4 shrink-0', styles.icon)} />

      {/* Time display */}
      <AnimatePresence mode="wait">
        <motion.span
          key={phase}
          className={cn('font-mono text-sm font-semibold tabular-nums', styles.text)}
          initial={{ opacity: 0, y: -4 }}
          animate={
            isInLastMinute
              ? {
                  opacity: [1, 0.4, 1],
                  y: 0,
                  scale: [1, 1.05, 1],
                  transition: {
                    opacity: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
                    scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
                    y: { duration: 0.2 },
                  },
                }
              : { opacity: 1, y: 0 }
          }
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
        >
          {isFinished ? '00:00' : formattedTime}
        </motion.span>
      </AnimatePresence>

      {/* Controls */}
      <TimerControls
        isRunning={isRunning}
        isPaused={isPaused}
        iconClass={styles.icon}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
      />
    </motion.div>
  )
}

function TimerControls({
  isRunning,
  isPaused,
  iconClass,
  onPlayPause,
  onReset,
}: {
  isRunning: boolean
  isPaused: boolean
  iconClass: string
  onPlayPause: () => void
  onReset: () => void
}): React.ReactNode {
  const btnClass = cn(
    'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors',
    'hover:bg-black/5 dark:hover:bg-white/10',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1',
  )

  return (
    <>
      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
      <motion.button
        type="button"
        onClick={onPlayPause}
        className={btnClass}
        whileTap={{ scale: 0.85 }}
        aria-label={!isRunning ? 'Start timer' : isPaused ? 'Resume timer' : 'Pause timer'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isRunning || isPaused ? (
            <motion.div
              key="play"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <Play className={cn('h-3.5 w-3.5', iconClass)} />
            </motion.div>
          ) : (
            <motion.div
              key="pause"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <Pause className={cn('h-3.5 w-3.5', iconClass)} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
      <motion.button
        type="button"
        onClick={onReset}
        className={btnClass}
        whileTap={{ scale: 0.85 }}
        aria-label="Reset timer"
      >
        <RotateCcw className={cn('h-3.5 w-3.5 text-gray-500 dark:text-gray-400')} />
      </motion.button>
    </>
  )
}
