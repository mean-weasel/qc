'use client'

import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { hapticFeedback } from '@/lib/haptics'
import type { DbNote } from '@/types'

import { createNote, updateNote } from '@/app/(app)/notes/actions'
import type { NoteActionState } from '@/app/(app)/notes/actions'

type NotePrivacy = 'private' | 'shared' | 'draft'

type Props = {
  note?: DbNote | null
  isOpen: boolean
  onClose: () => void
}

const PRIVACY_OPTIONS: { value: NotePrivacy; label: string; description: string }[] = [
  { value: 'shared', label: 'Shared', description: 'Visible to both partners' },
  { value: 'private', label: 'Private', description: 'Only visible to you' },
  { value: 'draft', label: 'Draft', description: 'Not yet shared' },
]

function PrivacySelector({
  privacy,
  onChange,
}: {
  privacy: NotePrivacy
  onChange: (value: NotePrivacy) => void
}): React.ReactNode {
  return (
    <div className="border-b border-border p-4">
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {PRIVACY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              privacy === option.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function TagList({ tags, onRemove }: { tags: string[]; onRemove: (tag: string) => void }): React.ReactNode {
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
        >
          #{tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            aria-label={`Remove tag ${tag}`}
            className="rounded-full hover:bg-primary/20"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
    </div>
  )
}

function NoteEditorFooter({
  wordCount,
  charCount,
  isPending,
  hasContent,
  isEditing,
  onClose,
}: {
  wordCount: number
  charCount: number
  isPending: boolean
  hasContent: boolean
  isEditing: boolean
  onClose: () => void
}): React.ReactNode {
  return (
    <div className="flex items-center justify-between border-t border-border p-4">
      <span className="text-xs text-muted-foreground">
        {wordCount} words &middot; {charCount}/5000
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !hasContent}
          className="gradient-primary rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : isEditing ? 'Update' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function NoteEditorForm({ note, onClose }: { note?: DbNote | null; onClose: () => void }): React.ReactNode {
  const isEditing = !!note
  const [content, setContent] = useState(note?.content ?? '')
  const [privacy, setPrivacy] = useState<NotePrivacy>(note?.privacy ?? 'shared')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(note?.tags ?? [])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const action = isEditing ? updateNote : createNote
  const [state, formAction, isPending] = useActionState<NoteActionState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData)
      if (!result.error) {
        toast.success('Note saved')
        if (!isEditing) hapticFeedback.noteAdded()
        onClose()
      } else {
        toast.error(result.error)
      }
      return result
    },
    { error: null },
  )

  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags((prev) => [...prev, tag])
      setTagInput('')
    }
  }, [tagInput, tags])

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddTag()
      }
    },
    [handleAddTag],
  )

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const charCount = content.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Edit Note' : 'New Note'}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-2xl flex-col rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl"
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold">{isEditing ? 'Edit Note' : 'New Note'}</h2>
          <button
            onClick={onClose}
            aria-label="Close editor"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form action={formAction} className="flex flex-1 flex-col overflow-hidden">
          {isEditing && <input type="hidden" name="id" value={note.id} />}
          {isEditing && note.updated_at && <input type="hidden" name="updated_at" value={note.updated_at} />}
          <input type="hidden" name="privacy" value={privacy} />
          <input type="hidden" name="tags" value={JSON.stringify(tags)} />

          {state.error && (
            <div className="mx-4 mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <PrivacySelector privacy={privacy} onChange={setPrivacy} />

          <div className="flex-1 overflow-auto p-4">
            <textarea
              ref={textareaRef}
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="mobile-input min-h-[200px] w-full resize-none bg-transparent text-base leading-relaxed focus:outline-none"
              maxLength={5000}
              required
            />
          </div>

          <div className="border-t border-border px-4 py-3">
            <TagList tags={tags} onRemove={handleRemoveTag} />
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add tags (press Enter)"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>

          <NoteEditorFooter
            wordCount={wordCount}
            charCount={charCount}
            isPending={isPending}
            hasContent={!!content.trim()}
            isEditing={isEditing}
            onClose={onClose}
          />
        </form>
      </div>
    </div>
  )
}

export function NoteEditor({ note, isOpen, onClose }: Props): React.ReactNode {
  if (!isOpen) return null
  return <NoteEditorForm key={note?.id ?? 'new'} note={note} onClose={onClose} />
}
