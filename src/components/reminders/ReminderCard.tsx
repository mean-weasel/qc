'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { AlarmClock, Clock, User } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { DbReminder } from '@/types/database'

interface Props {
  reminder: DbReminder
  isOwner: boolean
  isOverdue?: boolean
  assigneeName?: string
  onToggle: (id: string, isActive: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onSnooze: (id: string, duration: '15min' | '1hour' | 'tomorrow') => Promise<void>
  onUnsnooze: (id: string) => Promise<void>
}

const CATEGORY_COLORS: Record<DbReminder['category'], string> = {
  habit: 'bg-blue-100 text-blue-800',
  'check-in': 'bg-green-100 text-green-800',
  'action-item': 'bg-orange-100 text-orange-800',
  'special-date': 'bg-pink-100 text-pink-800',
  custom: 'bg-gray-100 text-gray-800',
}

const FREQUENCY_LABELS: Record<DbReminder['frequency'], string> = {
  once: 'One-time',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  custom: 'Custom',
}

function formatSchedule(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Overdue'
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 7) return `In ${diffDays} days`
  return date.toLocaleDateString()
}

function formatSnoozeUntil(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, h:mm a')
}

const SNOOZE_OPTIONS: { label: string; value: '15min' | '1hour' | 'tomorrow' }[] = [
  { label: '15 minutes', value: '15min' },
  { label: '1 hour', value: '1hour' },
  { label: 'Tomorrow morning', value: 'tomorrow' },
]

export function ReminderCard({
  reminder,
  isOwner,
  isOverdue,
  assigneeName,
  onToggle,
  onDelete,
  onSnooze,
  onUnsnooze,
}: Props): React.ReactElement {
  const [snoozeOpen, setSnoozeOpen] = useState(false)

  return (
    <Card className={`${!reminder.is_active ? 'opacity-60' : ''} ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium ${!reminder.is_active ? 'line-through' : ''}`}>{reminder.title}</h3>
            <Badge variant="secondary" className={CATEGORY_COLORS[reminder.category]}>
              {reminder.category}
            </Badge>
            {isOverdue && (
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                Overdue
              </Badge>
            )}
            {reminder.is_snoozed && reminder.snooze_until && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                <Clock className="mr-1 h-3 w-3" />
                Snoozed until {formatSnoozeUntil(reminder.snooze_until)}
              </Badge>
            )}
          </div>

          {reminder.message && <p className="text-sm text-muted-foreground">{reminder.message}</p>}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{FREQUENCY_LABELS[reminder.frequency]}</span>
            <span>·</span>
            <span>{formatSchedule(reminder.scheduled_for)}</span>
            <span>·</span>
            <span className="capitalize">{reminder.notification_channel.replace('-', ' ')}</span>
            {assigneeName && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Assigned to {assigneeName}
                </span>
              </>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px]"
              onClick={() => onToggle(reminder.id, !reminder.is_active)}
            >
              {reminder.is_active ? 'Pause' : 'Resume'}
            </Button>

            {reminder.is_snoozed ? (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] text-amber-600"
                onClick={() => onUnsnooze(reminder.id)}
              >
                <AlarmClock className="mr-1 h-4 w-4" />
                Unsnooze
              </Button>
            ) : (
              <div className="relative">
                <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={() => setSnoozeOpen(!snoozeOpen)}>
                  <Clock className="mr-1 h-4 w-4" />
                  Snooze
                </Button>
                {snoozeOpen && (
                  <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-md border bg-popover p-1 shadow-md">
                    {SNOOZE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          onSnooze(reminder.id, option.value)
                          setSnoozeOpen(false)
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] text-destructive"
              onClick={() => onDelete(reminder.id)}
            >
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
