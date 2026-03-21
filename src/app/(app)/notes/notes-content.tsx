'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { NoteEditor } from '@/components/notes/NoteEditor'
import { NoteList } from '@/components/notes/NoteList'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { PageContainer } from '@/components/layout/PageContainer'
import { useRealtimeCouple } from '@/hooks/useRealtimeCouple'
import type { DbNote, DbCategory } from '@/types'

import { bulkDeleteNotes, deleteNoteById } from './actions'

type Props = {
  notes: DbNote[]
  currentUserId: string
  coupleId: string
  categories: DbCategory[]
}

function HeaderActions({
  selectMode,
  onEnterSelect,
  onExitSelect,
  onNewNote,
}: {
  selectMode: boolean
  onEnterSelect: () => void
  onExitSelect: () => void
  onNewNote: () => void
}) {
  if (selectMode) {
    return (
      <button
        onClick={onExitSelect}
        className="touch-target rounded-xl border border-border px-4 py-2.5 font-semibold text-foreground transition-colors hover:bg-muted"
      >
        Cancel
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onEnterSelect}
        className="touch-target rounded-xl border border-border px-4 py-2.5 font-semibold text-foreground transition-colors hover:bg-muted"
      >
        Select
      </button>
      <button
        onClick={onNewNote}
        className="touch-target gradient-primary flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Note
      </button>
    </div>
  )
}

export function NotesPageContent({ notes: initialNotes, currentUserId, coupleId, categories }: Props) {
  const [notes, setNotes] = useState<DbNote[]>(initialNotes)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<DbNote | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  useRealtimeCouple<DbNote>({
    table: 'notes',
    coupleId,
    onInsert: (record) => {
      if (record.privacy === 'private' && record.author_id !== currentUserId) return
      if (record.privacy === 'draft' && record.author_id !== currentUserId) return
      setNotes((prev) => [record, ...prev])
    },
    onUpdate: (record) => setNotes((prev) => prev.map((n) => (n.id === record.id ? record : n))),
    onDelete: (record) => setNotes((prev) => prev.filter((n) => n.id !== record.id)),
  })

  const handleSelect = useCallback(
    (note: DbNote) => {
      // Only allow editing notes the current user authored
      if (note.author_id !== currentUserId) {
        toast.error('You can only edit notes you created')
        return
      }
      setEditingNote(note)
      setEditorOpen(true)
    },
    [currentUserId],
  )

  const handleDelete = useCallback((note: DbNote) => {
    setNotes((prev) => prev.filter((n) => n.id !== note.id))
    deleteNoteById(note.id)
      .then(({ error }) => {
        if (error) {
          toast.error('Failed to delete note')
          setNotes((prev) => [...prev, note].sort((a, b) => b.created_at.localeCompare(a.created_at)))
        } else {
          toast.success('Note deleted')
        }
      })
      .catch(() => {
        toast.error('Failed to delete note')
        setNotes((prev) => [...prev, note].sort((a, b) => b.created_at.localeCompare(a.created_at)))
      })
  }, [])

  const handleNewNote = useCallback(() => {
    setEditingNote(null)
    setEditorOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setEditorOpen(false)
    setEditingNote(null)
  }, [])

  const handleToggleSelect = useCallback((noteId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(noteId)) next.delete(noteId)
      else next.add(noteId)
      return next
    })
  }, [])

  const handleSelectAllOwn = useCallback(() => {
    setSelectedIds(new Set(notes.filter((n) => n.author_id === currentUserId).map((n) => n.id)))
  }, [notes, currentUserId])

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedIds.size === 0) return
    setShowBulkDeleteConfirm(true)
  }, [selectedIds])

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    const deletedNotes = notes.filter((n) => selectedIds.has(n.id))
    setNotes((prev) => prev.filter((n) => !selectedIds.has(n.id)))
    setSelectedIds(new Set())
    setSelectMode(false)
    setShowBulkDeleteConfirm(false)
    bulkDeleteNotes(ids)
      .then(({ error }) => {
        if (error) {
          toast.error('Failed to delete notes')
          setNotes((prev) => [...prev, ...deletedNotes].sort((a, b) => b.created_at.localeCompare(a.created_at)))
        } else {
          toast.success(`${ids.length} ${ids.length === 1 ? 'note' : 'notes'} deleted`)
        }
      })
      .catch(() => {
        toast.error('Failed to delete notes')
        setNotes((prev) => [...prev, ...deletedNotes].sort((a, b) => b.created_at.localeCompare(a.created_at)))
      })
  }, [selectedIds, notes])

  const handleExitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [])

  return (
    <PageContainer
      title="Notes"
      description="Keep track of your thoughts, insights, and reflections"
      action={
        <HeaderActions
          selectMode={selectMode}
          onEnterSelect={() => setSelectMode(true)}
          onExitSelect={handleExitSelectMode}
          onNewNote={handleNewNote}
        />
      }
    >
      <NoteList
        notes={notes}
        currentUserId={currentUserId}
        categories={categories}
        selectMode={selectMode}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onSelectAllOwn={handleSelectAllOwn}
        onClearSelection={handleClearSelection}
        onBulkDelete={handleBulkDeleteClick}
      />
      <NoteEditor note={editingNote} isOpen={editorOpen} onClose={handleClose} />

      <ConfirmDeleteDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        title="Delete Selected Notes"
        description={`Are you sure you want to delete ${selectedIds.size} ${selectedIds.size === 1 ? 'note' : 'notes'}? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
      />
    </PageContainer>
  )
}
