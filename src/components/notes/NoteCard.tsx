'use client'

import { cn } from '@/lib/utils'
import type { DbNote, DbCategory } from '@/types'

import { PrivacyBadge } from './PrivacyBadge'

type Props = {
  note: DbNote
  isOwn: boolean
  onSelect?: (note: DbNote) => void
  onDelete?: (note: DbNote) => void
  selectMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (noteId: string) => void
  category?: DbCategory | null
  className?: string
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function NoteCard({
  note,
  isOwn,
  onSelect,
  onDelete,
  selectMode = false,
  isSelected = false,
  onToggleSelect,
  category,
  className,
}: Props) {
  function handleClick() {
    if (selectMode && isOwn && onToggleSelect) {
      onToggleSelect(note.id)
    } else if (!selectMode) {
      onSelect?.(note)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick()
      }}
      className={cn(
        'group rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md',
        'cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring',
        selectMode && isSelected && 'ring-2 ring-primary',
        selectMode && !isOwn && 'opacity-50',
        className,
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {selectMode && isOwn && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect?.(note.id)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              aria-label={`Select note`}
            />
          )}
          <PrivacyBadge privacy={note.privacy} />
        </div>
        {!selectMode && isOwn && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(note)
            }}
            className="rounded-md p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            aria-label="Delete note"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Category badge */}
      {category && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </span>
        </div>
      )}

      {/* Content */}
      <p className="mb-3 line-clamp-3 text-sm text-foreground">{note.content}</p>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {note.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              #{tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{isOwn ? 'You' : 'Partner'}</span>
        <span>{formatRelativeDate(note.created_at)}</span>
      </div>
    </div>
  )
}
