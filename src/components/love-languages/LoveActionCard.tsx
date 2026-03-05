'use client'

import type { LoveAction } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, Calendar, Clock, Edit2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoveActionCardProps {
  action: LoveAction
  linkedLanguageTitle?: string
  onComplete?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

const STATUS_COLORS: Record<string, string> = {
  suggested: 'bg-blue-100 text-blue-700',
  planned: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  recurring: 'bg-purple-100 text-purple-700',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-600',
  moderate: 'text-yellow-600',
  challenging: 'text-red-600',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function LoveActionCard({
  action,
  linkedLanguageTitle,
  onComplete,
  onEdit,
  onDelete,
}: LoveActionCardProps): React.ReactNode {
  const isCompleted = action.status === 'completed'

  return (
    <Card className={cn('bg-white hover:shadow-lg transition-all', isCompleted && 'opacity-75')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400" />
              )}
              <CardTitle className={cn('text-lg text-gray-900', isCompleted && 'line-through')}>
                {action.title}
              </CardTitle>
            </div>
            {action.description && (
              <CardDescription className="mt-1 text-gray-700">{action.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {linkedLanguageTitle && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>For: {linkedLanguageTitle}</span>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={STATUS_COLORS[action.status]}>{action.status}</Badge>
            <Badge variant="outline" className="text-gray-700">
              <Clock className="h-3 w-3 mr-1" />
              {action.frequency}
            </Badge>
            <span className={cn('text-sm font-medium', DIFFICULTY_COLORS[action.difficulty])}>{action.difficulty}</span>
          </div>

          {action.completedCount > 0 && (
            <div className="text-sm text-gray-600">
              Completed {action.completedCount} {action.completedCount === 1 ? 'time' : 'times'}
              {action.lastCompletedAt && <span> &#8226; Last on {formatDate(action.lastCompletedAt)}</span>}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            {!isCompleted && onComplete && (
              <Button onClick={onComplete} size="sm" className="min-h-[44px] flex-1">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark Complete
              </Button>
            )}
            {onEdit && (
              <Button
                onClick={onEdit}
                variant="outline"
                size="sm"
                className={cn('min-h-[44px]', !isCompleted ? '' : 'flex-1')}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button onClick={onDelete} variant="outline" size="sm" className="min-h-[44px]">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
