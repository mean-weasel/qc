'use client'

import Link from 'next/link'
import { differenceInDays, formatDistanceToNow, parseISO } from 'date-fns'
import { Flame, HeartPulse } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CheckInCardProps {
  lastCheckInDate: string | null
  totalCheckIns: number
  currentStreak: number
  frequencyGoal: string | null
}

const FREQUENCY_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
}

function getGoalDays(goal: string | null): number {
  if (!goal) return 7
  // eslint-disable-next-line security/detect-object-injection -- goal is from validated DB settings
  return FREQUENCY_DAYS[goal] ?? 7
}

function getProgress(daysSince: number, goalDays: number): number {
  if (goalDays <= 0) return 1
  return Math.min(daysSince / goalDays, 1)
}

function getProgressColor(progress: number): string {
  if (progress < 0.5) return 'text-green-500'
  if (progress < 0.75) return 'text-yellow-500'
  return 'text-red-500'
}

function getRingColor(progress: number): string {
  if (progress < 0.5) return 'stroke-green-500'
  if (progress < 0.75) return 'stroke-yellow-500'
  return 'stroke-red-500'
}

function ProgressRing({ progress, daysSince }: { progress: number; daysSince: number | null }): React.ReactNode {
  const size = 60
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(progress, 1))
  const isOverdue = progress >= 1

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-500', getRingColor(progress), isOverdue && 'animate-pulse')}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {daysSince === null ? (
          <span className="text-xs font-semibold text-muted-foreground">--</span>
        ) : daysSince === 0 ? (
          <span className="text-lg">✓</span>
        ) : (
          <span className={cn('text-sm font-bold', getProgressColor(progress))}>{daysSince}d</span>
        )}
      </div>
    </div>
  )
}

export function CheckInCard({
  lastCheckInDate,
  totalCheckIns,
  currentStreak,
  frequencyGoal,
}: CheckInCardProps): React.ReactNode {
  const goalDays = getGoalDays(frequencyGoal)
  const daysSince = lastCheckInDate ? differenceInDays(new Date(), parseISO(lastCheckInDate)) : null
  const progress = daysSince !== null ? getProgress(daysSince, goalDays) : 0
  const isOverdue = daysSince !== null && daysSince >= goalDays

  const statusText = (() => {
    if (daysSince === null) return 'No check-ins yet'
    if (daysSince === 0) return 'Checked in today'
    return `Last check-in: ${formatDistanceToNow(parseISO(lastCheckInDate!), { addSuffix: true })}`
  })()

  const subtitleText = (() => {
    if (daysSince === null) return 'Start your first check-in!'
    if (isOverdue) return `Overdue by ${daysSince - goalDays + 1} day${daysSince - goalDays + 1 !== 1 ? 's' : ''}`
    const daysLeft = goalDays - daysSince
    if (daysLeft <= 0) return 'Check in now!'
    return `Next check-in in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
  })()

  return (
    <Card className="bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-pink-500" />
          Check-in Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <ProgressRing progress={progress} daysSince={daysSince} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{statusText}</p>
            <p className={cn('text-xs mt-0.5', isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
              {subtitleText}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-gray-900 dark:text-white">{currentStreak}</span>
              <span className="text-muted-foreground">{currentStreak === 1 ? 'week' : 'weeks'}</span>
            </div>
          )}
          {currentStreak === 0 && <div />}
          <span className="text-xs text-muted-foreground">{totalCheckIns} total</span>
        </div>

        <Link href="/checkin" className="block">
          <Button variant={isOverdue ? 'destructive' : 'default'} className="w-full">
            Start Check-in
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
