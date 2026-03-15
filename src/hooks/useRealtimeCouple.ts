'use client'

import { useEffect, useRef, useState } from 'react'
import type { RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'

type RealtimeTable =
  | 'notes'
  | 'check_ins'
  | 'action_items'
  | 'requests'
  | 'love_languages'
  | 'love_actions'
  | 'categories'
  | 'session_settings_proposals'
  | 'love_language_discoveries'
  | 'reminders'
  | 'milestones'

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'error'

interface UseRealtimeCoupleOptions<T = Record<string, unknown>> {
  table: RealtimeTable
  coupleId: string | null
  onInsert?: (record: T) => void
  onUpdate?: (record: T) => void
  onDelete?: (oldRecord: T) => void
  onReconnect?: () => void
}

interface UseRealtimeCoupleReturn {
  status: RealtimeStatus
}

export function useRealtimeCouple<T>({
  table,
  coupleId,
  onInsert,
  onUpdate,
  onDelete,
  onReconnect,
}: UseRealtimeCoupleOptions<T>): UseRealtimeCoupleReturn {
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)
  const onReconnectRef = useRef(onReconnect)
  const wasDisconnectedRef = useRef(false)

  useEffect(() => {
    onInsertRef.current = onInsert
    onUpdateRef.current = onUpdate
    onDeleteRef.current = onDelete
    onReconnectRef.current = onReconnect
  }, [onInsert, onUpdate, onDelete, onReconnect])

  useEffect(() => {
    if (!coupleId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`${table}:couple:${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.eventType === 'INSERT' && onInsertRef.current) {
            onInsertRef.current(payload.new as T)
          } else if (payload.eventType === 'UPDATE' && onUpdateRef.current) {
            onUpdateRef.current(payload.new as T)
          } else if (payload.eventType === 'DELETE' && onDeleteRef.current) {
            onDeleteRef.current(payload.old as T)
          }
        },
      )
      .subscribe((subscriptionStatus: `${REALTIME_SUBSCRIBE_STATES}`) => {
        if (subscriptionStatus === 'SUBSCRIBED') {
          if (wasDisconnectedRef.current) {
            onReconnectRef.current?.()
            wasDisconnectedRef.current = false
          }
          setStatus('connected')
        } else if (subscriptionStatus === 'CHANNEL_ERROR') {
          wasDisconnectedRef.current = true
          setStatus('error')
        } else if (subscriptionStatus === 'TIMED_OUT') {
          wasDisconnectedRef.current = true
          setStatus('reconnecting')
        } else if (subscriptionStatus === 'CLOSED') {
          setStatus('connecting')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, coupleId])

  return { status }
}
