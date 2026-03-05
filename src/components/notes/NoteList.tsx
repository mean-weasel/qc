'use client'

import { useState, useMemo } from 'react'

import type { DbNote, DbCategory } from '@/types'

import { NoteCard } from './NoteCard'

type NoteFilter = 'all' | 'shared' | 'private' | 'draft'
type NoteSort = 'newest' | 'oldest' | 'title'
type DateRange = 'any' | 'today' | '7days' | '30days'

type Props = {
  notes: DbNote[]
  currentUserId: string
  categories?: DbCategory[]
  selectMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (noteId: string) => void
  onSelect: (note: DbNote) => void
  onDelete: (note: DbNote) => void
  onSelectAllOwn?: () => void
  onClearSelection?: () => void
  onBulkDelete?: () => void
}

const PRIVACY_FILTERS: { value: NoteFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'shared', label: 'Shared' },
  { value: 'private', label: 'Private' },
  { value: 'draft', label: 'Drafts' },
]

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
]

function getDateRangeCutoff(range: DateRange): Date | null {
  if (range === 'any') return null
  const now = new Date()
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === '7days') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  if (range === '30days') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return null
}

type FilterChipProps<T extends string> = {
  items: { value: T; label: string }[]
  active: T
  onSelect: (value: T) => void
}

function FilterChips<T extends string>({ items, active, onSelect }: FilterChipProps<T>) {
  return (
    <div className="flex gap-1">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onSelect(item.value)}
          className={`touch-target rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            active === item.value
              ? 'gradient-primary text-white'
              : 'border border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function BulkActionBar({
  count,
  onSelectAllOwn,
  onClearSelection,
  onBulkDelete,
}: {
  count: number
  onSelectAllOwn?: () => void
  onClearSelection?: () => void
  onBulkDelete?: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
      <span className="text-sm font-medium">{count} selected</span>
      <div className="flex gap-2">
        <button onClick={onSelectAllOwn} className="rounded-md px-2 py-1 text-sm text-primary hover:bg-primary/10">
          Select all own
        </button>
        <button
          onClick={onClearSelection}
          className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
        >
          Clear
        </button>
        {count > 0 && (
          <button
            onClick={onBulkDelete}
            className="rounded-md bg-destructive px-3 py-1 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            Delete {count}
          </button>
        )}
      </div>
    </div>
  )
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="py-12 text-center">
      <svg
        className="mx-auto mb-4 h-12 w-12 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
      <h3 className="mb-1 text-lg font-medium">No notes found</h3>
      <p className="text-sm text-muted-foreground">
        {hasSearch ? 'Try adjusting your search terms' : 'Start by creating your first note'}
      </p>
    </div>
  )
}

export function NoteList({
  notes,
  currentUserId,
  categories = [],
  selectMode = false,
  selectedIds = new Set(),
  onToggleSelect,
  onSelect,
  onDelete,
  onSelectAllOwn,
  onClearSelection,
  onBulkDelete,
}: Props) {
  const [filter, setFilter] = useState<NoteFilter>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<NoteSort>('newest')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange>('any')

  const categoryMap = useMemo(() => {
    const map = new Map<string, DbCategory>()
    for (const cat of categories) map.set(cat.id, cat)
    return map
  }, [categories])

  const filtered = useMemo(() => {
    const cutoff = getDateRangeCutoff(dateRange)
    const result = notes.filter((note) => {
      if (filter !== 'all' && note.privacy !== filter) return false
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'uncategorized' ? note.category_id !== null : note.category_id !== categoryFilter)
          return false
      }
      if (cutoff && new Date(note.created_at) < cutoff) return false
      if (search) {
        const term = search.toLowerCase()
        if (!note.content.toLowerCase().includes(term) && !note.tags.some((t) => t.toLowerCase().includes(term)))
          return false
      }
      return true
    })
    return [...result].sort((a, b) => {
      if (sort === 'oldest') return a.created_at.localeCompare(b.created_at)
      if (sort === 'title') return a.content.localeCompare(b.content)
      return b.created_at.localeCompare(a.created_at)
    })
  }, [notes, filter, search, sort, categoryFilter, dateRange])

  const hasActiveFilter = filter !== 'all' || search || categoryFilter !== 'all' || dateRange !== 'any'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            placeholder="Search notes, categories, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mobile-input w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <FilterChips items={PRIVACY_FILTERS} active={filter} onSelect={setFilter} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="h-11 rounded-lg border border-border bg-input px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All categories</option>
            <option value="uncategorized">Uncategorized</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        )}
        <FilterChips items={DATE_RANGES} active={dateRange} onSelect={setDateRange} />
      </div>

      {selectMode && (
        <BulkActionBar
          count={selectedIds.size}
          onSelectAllOwn={onSelectAllOwn}
          onClearSelection={onClearSelection}
          onBulkDelete={onBulkDelete}
        />
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'note' : 'notes'}
          {hasActiveFilter ? ' found' : ''}
        </p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as NoteSort)}
          className="h-11 rounded-lg border border-border bg-input px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">By title</option>
        </select>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isOwn={note.author_id === currentUserId}
              onSelect={onSelect}
              onDelete={note.author_id === currentUserId ? onDelete : undefined}
              selectMode={selectMode}
              isSelected={selectedIds.has(note.id)}
              onToggleSelect={onToggleSelect}
              category={note.category_id ? (categoryMap.get(note.category_id) ?? null) : null}
            />
          ))}
        </div>
      ) : (
        <EmptyState hasSearch={!!search} />
      )}
    </div>
  )
}
