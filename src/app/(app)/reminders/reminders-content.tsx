'use client'

import { useActionState, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { toast } from 'sonner'

import { ReminderCard } from '@/components/reminders/ReminderCard'
import { ReminderForm } from '@/components/reminders/ReminderForm'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRealtimeCouple } from '@/hooks/useRealtimeCouple'
import type { DbReminder } from '@/types/database'

import { createReminder } from './actions'
import type { ReminderActionState } from './actions'
import { useReminderHandlers } from './use-reminder-handlers'

interface Props {
  initialReminders: DbReminder[]
  userId: string
  coupleId: string | null
  partnerId: string | null
}

type ReminderFilter = 'all' | 'active' | 'snoozed' | 'overdue' | 'inactive'
type CategoryFilter = 'all' | DbReminder['category']

const CATEGORY_FILTERS: { id: CategoryFilter; label: string; emoji: string }[] = [
  { id: 'all', label: 'All Categories', emoji: '' },
  { id: 'habit', label: 'Habits', emoji: '💜' },
  { id: 'check-in', label: 'Check-ins', emoji: '💬' },
  { id: 'action-item', label: 'Action Items', emoji: '✅' },
  { id: 'special-date', label: 'Special Dates', emoji: '🎉' },
  { id: 'custom', label: 'Custom', emoji: '⭐' },
]

function isReminderOverdue(r: DbReminder): boolean {
  return new Date(r.scheduled_for) < new Date() && r.is_active && !r.is_snoozed
}

function getFilterCount(reminders: DbReminder[], f: ReminderFilter): number {
  switch (f) {
    case 'all':
      return reminders.length
    case 'active':
      return reminders.filter((r) => r.is_active && !r.is_snoozed).length
    case 'snoozed':
      return reminders.filter((r) => r.is_snoozed).length
    case 'overdue':
      return reminders.filter((r) => isReminderOverdue(r)).length
    case 'inactive':
      return reminders.filter((r) => !r.is_active).length
  }
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }): React.ReactElement {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search reminders..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export function RemindersContent({ initialReminders, userId, coupleId, partnerId }: Props): React.ReactElement {
  const [reminders, setReminders] = useState(initialReminders)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<ReminderFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [search, setSearch] = useState('')
  const { handleToggle, handleDelete, handleSnooze, handleUnsnooze } = useReminderHandlers(reminders, setReminders)

  useRealtimeCouple<DbReminder>({
    table: 'reminders',
    coupleId,
    onInsert: (newReminder) => {
      setReminders((prev) => {
        if (prev.some((r) => r.id === newReminder.id)) return prev
        return [...prev, newReminder]
      })
    },
    onUpdate: (updatedReminder) => {
      setReminders((prev) => prev.map((r) => (r.id === updatedReminder.id ? updatedReminder : r)))
    },
    onDelete: (deletedReminder) => {
      setReminders((prev) => prev.filter((r) => r.id !== deletedReminder.id))
    },
  })

  const [formState, formAction, isPending] = useActionState<ReminderActionState, FormData>(async (prev, formData) => {
    const result = await createReminder(prev, formData)
    if (result.success && result.reminder) {
      setReminders((r) => [...r, result.reminder!])
      setShowForm(false)
      toast.success('Reminder created')
    }
    if (result.error) {
      toast.error(result.error)
    }
    return result
  }, {})

  const filtered = useMemo(() => {
    let result = reminders.filter((r) => {
      if (filter === 'active') return r.is_active && !r.is_snoozed
      if (filter === 'snoozed') return r.is_snoozed
      if (filter === 'overdue') return isReminderOverdue(r)
      if (filter === 'inactive') return !r.is_active
      return true
    })

    if (categoryFilter !== 'all') {
      result = result.filter((r) => r.category === categoryFilter)
    }

    if (search.trim()) {
      const term = search.trim().toLowerCase()
      result = result.filter(
        (r) => r.title.toLowerCase().includes(term) || (r.message && r.message.toLowerCase().includes(term)),
      )
    }

    if (filter === 'all' || filter === 'active') {
      result.sort((a, b) => Number(isReminderOverdue(b)) - Number(isReminderOverdue(a)))
    }

    return result
  }, [reminders, filter, categoryFilter, search])

  return (
    <PageContainer
      title="Reminders"
      description="Stay connected with thoughtful reminders for your relationship"
      action={<Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'New Reminder'}</Button>}
    >
      {showForm && (
        <ReminderForm
          formAction={formAction}
          formState={formState}
          isPending={isPending}
          coupleId={coupleId}
          userId={userId}
          partnerId={partnerId ?? undefined}
        />
      )}

      <SearchBar value={search} onChange={setSearch} />

      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'active', 'snoozed', 'overdue', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`touch-target flex items-center gap-1.5 rounded-full px-3 py-2 text-sm capitalize ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {f}
            <span
              className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium ${
                filter === f ? 'bg-primary-foreground/20' : 'bg-background/60'
              }`}
            >
              {getFilterCount(reminders, f)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`touch-target whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
              categoryFilter === cat.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {cat.emoji && <span className="mr-1">{cat.emoji}</span>}
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {filter === 'all' && !search
            ? 'No reminders yet. Create one to get started!'
            : search
              ? 'No reminders match your search.'
              : `No ${filter} reminders.`}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              isOwner={reminder.created_by === userId}
              isOverdue={isReminderOverdue(reminder)}
              assigneeName={reminder.assigned_to ? (reminder.assigned_to === userId ? 'You' : 'Partner') : undefined}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onSnooze={handleSnooze}
              onUnsnooze={handleUnsnooze}
            />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
