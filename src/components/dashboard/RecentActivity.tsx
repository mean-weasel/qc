'use client'

import { useState, useMemo } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { CheckCircle2, StickyNote, Trophy, ListChecks, HandHeart, Clock } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ActivityItem } from '@/lib/activity'

type ActivityFilter = 'all' | ActivityItem['type']

interface RecentActivityProps {
  activities: ActivityItem[]
  className?: string
}

const ICON_MAP: Record<ActivityItem['type'], React.ReactNode> = {
  'check-in': <CheckCircle2 className="h-4 w-4" />,
  note: <StickyNote className="h-4 w-4" />,
  milestone: <Trophy className="h-4 w-4" />,
  'action-item': <ListChecks className="h-4 w-4" />,
  request: <HandHeart className="h-4 w-4" />,
}

const COLOR_MAP: Record<ActivityItem['type'], string> = {
  'check-in': 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
  note: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
  milestone: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
  'action-item': 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400',
  request: 'bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-400',
}

const FILTER_OPTIONS: Array<{ id: ActivityFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'check-in', label: 'Check-ins' },
  { id: 'note', label: 'Notes' },
  { id: 'milestone', label: 'Milestones' },
  { id: 'action-item', label: 'Actions' },
  { id: 'request', label: 'Requests' },
]

const PAGE_SIZE = 5

function ActivityRow({ activity }: { activity: ActivityItem }): React.ReactNode {
  const relativeTime = formatDistanceToNow(parseISO(activity.timestamp), { addSuffix: true })

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', COLOR_MAP[activity.type])}>
        {ICON_MAP[activity.type]}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {activity.description && (
            <span className="truncate text-xs text-gray-500 dark:text-gray-400">{activity.description}</span>
          )}
          <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{relativeTime}</span>
        </div>
      </div>
    </div>
  )
}

function EmptyState(): React.ReactNode {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <Clock className="h-6 w-6 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">No activity yet</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Start a check-in, write a note, or set a milestone to see your journey here.
      </p>
    </div>
  )
}

export function RecentActivity({ activities, className }: RecentActivityProps): React.ReactNode {
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    if (filter === 'all') return activities
    return activities.filter((a) => a.type === filter)
  }, [activities, filter])

  const visible = filtered.slice(0, displayCount)
  const hasMore = filtered.length > displayCount

  function handleFilterChange(newFilter: ActivityFilter): void {
    setFilter(newFilter)
    setDisplayCount(PAGE_SIZE)
  }

  return (
    <Card className={cn('bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow', className)}>
      <CardHeader>
        <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-pink-500" />
          Recent Activity
        </CardTitle>
        {activities.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pt-2">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleFilterChange(f.id)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 min-h-[44px] min-w-[44px] text-xs font-medium transition-colors',
                  filter === f.id
                    ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {visible.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {visible.map((activity, index) => (
              <ActivityRow key={`${activity.type}-${activity.timestamp}-${index}`} activity={activity} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
        {hasMore && (
          <button
            type="button"
            onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
            className="mt-3 w-full rounded-lg border border-gray-200 py-2 min-h-[44px] text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Show more
          </button>
        )}
      </CardContent>
    </Card>
  )
}
