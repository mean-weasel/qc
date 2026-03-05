'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Heart,
  Briefcase,
  MessageSquare,
  Bell,
  Sparkles,
  MoreHorizontal,
  Clock,
  Check,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import type { DbRequest } from '@/types/database'

interface Props {
  request: DbRequest
  isReceiver: boolean
  onRespond: (id: string, status: 'accepted' | 'declined') => Promise<void>
  onDelete: (id: string) => Promise<void>
  onConvertToReminder?: (id: string) => Promise<void>
  isConverting?: boolean
}

const PRIORITY_CONFIG: Record<DbRequest['priority'], { color: string; icon: boolean }> = {
  low: { color: 'bg-green-100 text-green-700', icon: false },
  medium: { color: 'bg-yellow-100 text-yellow-700', icon: false },
  high: { color: 'bg-red-100 text-red-700', icon: true },
}

const STATUS_CONFIG: Record<DbRequest['status'], { color: string; icon: typeof Clock }> = {
  pending: { color: 'bg-blue-100 text-blue-800', icon: Clock },
  accepted: { color: 'bg-green-100 text-green-800', icon: Check },
  declined: { color: 'bg-red-100 text-red-800', icon: X },
  converted: { color: 'bg-purple-100 text-purple-800', icon: RefreshCw },
}

const CATEGORY_CONFIG: Record<DbRequest['category'], { label: string; icon: typeof Heart; color: string }> = {
  activity: { label: 'Activity', icon: Heart, color: 'bg-pink-100 text-pink-700' },
  task: { label: 'Task', icon: Briefcase, color: 'bg-blue-100 text-blue-700' },
  reminder: { label: 'Reminder', icon: Bell, color: 'bg-amber-100 text-amber-700' },
  conversation: { label: 'Conversation', icon: MessageSquare, color: 'bg-purple-100 text-purple-700' },
  'date-night': { label: 'Date Night', icon: Sparkles, color: 'bg-rose-100 text-rose-700' },
  custom: { label: 'Custom', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-700' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

export function RequestCard({
  request,
  isReceiver,
  onRespond,
  onDelete,
  onConvertToReminder,
  isConverting = false,
}: Props): React.ReactElement {
  const isPending = request.status === 'pending'
  const isAccepted = request.status === 'accepted'
  const isConverted = request.status === 'converted'
  const canConvert = isAccepted && !isConverted && onConvertToReminder

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium">{request.title}</h3>
            <Badge variant="secondary" className={`flex items-center gap-1 ${STATUS_CONFIG[request.status].color}`}>
              {(() => {
                const StatusIcon = STATUS_CONFIG[request.status].icon
                return <StatusIcon className="h-3 w-3" />
              })()}
              {request.status}
            </Badge>
            <Badge variant="secondary" className={`flex items-center gap-1 ${PRIORITY_CONFIG[request.priority].color}`}>
              {PRIORITY_CONFIG[request.priority].icon && <AlertCircle className="h-3 w-3" />}
              {request.priority}
            </Badge>
            {isConverted && request.converted_to_reminder_id && (
              <Badge variant="outline" className="text-xs">
                🔗 Linked to Reminder
              </Badge>
            )}
          </div>

          {request.description && <p className="text-sm text-muted-foreground">{request.description}</p>}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className={`flex items-center gap-1 ${CATEGORY_CONFIG[request.category].color}`}>
              {(() => {
                const CatIcon = CATEGORY_CONFIG[request.category].icon
                return <CatIcon className="h-3 w-3" />
              })()}
              {CATEGORY_CONFIG[request.category].label}
            </Badge>
            {request.suggested_date && (
              <>
                <span>·</span>
                <span>Suggested: {formatDate(request.suggested_date)}</span>
              </>
            )}
            <span>·</span>
            <span>Created {formatDate(request.created_at)}</span>
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          {isReceiver && isPending && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px]"
                onClick={() => onRespond(request.id, 'accepted')}
              >
                Accept
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px]"
                onClick={() => onRespond(request.id, 'declined')}
              >
                Decline
              </Button>
            </>
          )}
          {canConvert && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => onConvertToReminder(request.id)}
              disabled={isConverting}
            >
              {isConverting ? 'Converting...' : 'Convert to Reminder'}
            </Button>
          )}
          {!isReceiver && !isConverted && (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] text-destructive"
              onClick={() => onDelete(request.id)}
            >
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
