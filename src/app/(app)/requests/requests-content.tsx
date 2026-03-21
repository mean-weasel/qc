'use client'

import { useActionState, useCallback, useState } from 'react'
import { toast } from 'sonner'

import { Inbox, Send } from 'lucide-react'

import { RequestCard } from '@/components/requests/RequestCard'
import { RequestForm } from '@/components/requests/RequestForm'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import { useRealtimeCouple } from '@/hooks/useRealtimeCouple'
import type { DbRequest } from '@/types/database'

import { convertRequestToReminder, createRequest, deleteRequest, respondToRequest } from './actions'
import type { RequestActionState } from './actions'

interface TabButtonProps {
  tab: 'received' | 'sent'
  active: boolean
  count: number
  pending: number
  onClick: () => void
}

function TabButton({ tab, active, count, pending, onClick }: TabButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={`touch-target flex items-center gap-1.5 rounded-full px-3 py-2 text-sm capitalize ${
        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}
    >
      {tab} ({count})
      {pending > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500 px-1.5 text-xs font-bold text-white">
          {pending}
        </span>
      )}
    </button>
  )
}

function NewRequestButton({
  showForm,
  partnerId,
  onToggle,
}: {
  showForm: boolean
  partnerId: string | null
  onToggle: () => void
}): React.ReactElement {
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={onToggle}
        disabled={!partnerId}
        title={!partnerId ? 'Connect with a partner to send requests' : undefined}
      >
        {showForm ? 'Cancel' : 'New Request'}
      </Button>
      {!partnerId && <p className="text-xs text-muted-foreground">Connect with a partner to send requests</p>}
    </div>
  )
}

interface Props {
  initialRequests: DbRequest[]
  userId: string
  coupleId: string | null
  partnerId: string | null
  partnerName: string
}

export function RequestsContent({
  initialRequests,
  userId,
  coupleId,
  partnerId,
  partnerName,
}: Props): React.ReactElement {
  const [requests, setRequests] = useState(initialRequests)
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState<'received' | 'sent'>('received')
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const [formState, formAction, isPending] = useActionState<RequestActionState, FormData>(async (prev, formData) => {
    const result = await createRequest(prev, formData)
    if (result.success) {
      setShowForm(false)
      toast.success('Request sent')
    }
    if (result.error) {
      toast.error(result.error)
    }
    return result
  }, {})

  useRealtimeCouple<DbRequest>({
    table: 'requests',
    coupleId,
    onInsert: useCallback((record: DbRequest) => {
      setRequests((prev) => [record, ...prev])
    }, []),
    onUpdate: useCallback((record: DbRequest) => {
      setRequests((prev) => prev.map((r) => (r.id === record.id ? record : r)))
    }, []),
    onDelete: useCallback((old: DbRequest) => {
      setRequests((prev) => prev.filter((r) => r.id !== old.id))
    }, []),
  })

  async function handleRespond(id: string, status: 'accepted' | 'declined'): Promise<void> {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    const result = await respondToRequest(id, status)
    if (result.error) {
      toast.error(result.error)
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'pending' as const } : r)))
    } else {
      toast.success('Response sent')
    }
  }

  async function handleDeleteClick(id: string): Promise<void> {
    setDeleteTarget(id)
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!deleteTarget) return
    const id = deleteTarget
    setDeleteTarget(null)
    const prev = requests
    setRequests((r) => r.filter((req) => req.id !== id))
    const result = await deleteRequest(id)
    if (result.error) {
      toast.error(result.error)
      setRequests(prev)
    } else {
      toast.success('Request deleted')
    }
  }

  async function handleConvertToReminder(id: string): Promise<void> {
    setConvertingId(id)
    try {
      const result = await convertRequestToReminder(id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Request converted to reminder')
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status: 'converted' as const, converted_to_reminder_id: result.reminderId ?? null }
              : r,
          ),
        )
      }
    } finally {
      setConvertingId(null)
    }
  }

  const received = requests.filter((r) => r.requested_for === userId)
  const sent = requests.filter((r) => r.requested_by === userId)
  const displayed = tab === 'received' ? received : sent

  return (
    <PageContainer
      title="Requests"
      description="Send and receive thoughtful requests with your partner"
      action={<NewRequestButton showForm={showForm} partnerId={partnerId} onToggle={() => setShowForm(!showForm)} />}
    >
      {showForm && partnerId && (
        <RequestForm
          formAction={formAction}
          formState={formState}
          isPending={isPending}
          partnerId={partnerId}
          partnerName={partnerName}
        />
      )}

      <div className="flex gap-2">
        <TabButton
          tab="received"
          active={tab === 'received'}
          count={received.length}
          pending={received.filter((r) => r.status === 'pending').length}
          onClick={() => setTab('received')}
        />
        <TabButton
          tab="sent"
          active={tab === 'sent'}
          count={sent.length}
          pending={sent.filter((r) => r.status === 'pending').length}
          onClick={() => setTab('sent')}
        />
      </div>

      {displayed.length === 0 ? (
        <div className="py-12 text-center">
          {tab === 'received' ? (
            <Inbox className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          ) : (
            <Send className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          )}
          <p className="text-muted-foreground">
            No {tab} requests yet.{tab === 'sent' && partnerId ? ' Send one to your partner!' : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              isReceiver={request.requested_for === userId}
              onRespond={handleRespond}
              onDelete={handleDeleteClick}
              onConvertToReminder={handleConvertToReminder}
              isConverting={convertingId === request.id}
            />
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Delete Request"
        description="Are you sure you want to delete this request? This action cannot be undone."
        onConfirm={() => void handleConfirmDelete()}
      />
    </PageContainer>
  )
}
